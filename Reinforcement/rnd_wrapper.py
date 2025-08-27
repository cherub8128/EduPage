import gymnasium as gym
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import random

# RND의 타겟/예측 네트워크를 위한 간단한 신경망 구조
def build_network(input_dim, output_dim):
    return nn.Sequential(
        nn.Linear(input_dim, 128),
        nn.ReLU(),
        nn.Linear(128, 128),
        nn.ReLU(),
        nn.Linear(128, output_dim)
    )

class RunningMeanStd:
    # https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
    def __init__(self, epsilon=1e-4, shape=()):
        self.mean = np.zeros(shape, 'float64')
        self.var = np.ones(shape, 'float64')
        self.count = epsilon

    def update(self, x):
        batch_mean = np.mean(x, axis=0)
        batch_var = np.var(x, axis=0)
        batch_count = x.shape[0]
        self.update_from_moments(batch_mean, batch_var, batch_count)

    def update_from_moments(self, batch_mean, batch_var, batch_count):
        delta = batch_mean - self.mean
        tot_count = self.count + batch_count

        new_mean = self.mean + delta * batch_count / tot_count
        m_a = self.var * self.count
        m_b = batch_var * batch_count
        M2 = m_a + m_b + np.square(delta) * self.count * batch_count / tot_count
        new_var = M2 / tot_count
        
        self.mean = new_mean
        self.var = new_var
        self.count = tot_count

class RNDRewardWrapper(gym.Wrapper):
    def __init__(self, env: gym.Env, feature_dim: int = 128, lr: float = 1e-4):
        super().__init__(env)
        
        # 관찰 공간의 형태를 1차원으로 변환
        obs_shape = self.observation_space.shape
        self.obs_dim = np.prod(obs_shape)

        # 1. 타겟 네트워크 (고정)와 예측 네트워크 (학습) 생성
        self.target_network = build_network(self.obs_dim, feature_dim)
        self.predictor_network = build_network(self.obs_dim, feature_dim)

        # 타겟 네트워크는 학습하지 않도록 설정
        for param in self.target_network.parameters():
            param.requires_grad = False
        
        # 2. 예측 네트워크를 위한 옵티마이저 설정
        self.optimizer = optim.Adam(self.predictor_network.parameters(), lr=lr)

        # 3. 안정적인 학습을 위한 관찰 정규화
        self.obs_rms = RunningMeanStd(shape=(self.obs_dim,))
        
        # 4. 내재적 보상 정규화를 위한 값 저장
        self.reward_buffer = deque(maxlen=1000)

    def _compute_intrinsic_reward(self, obs: np.ndarray):
        # 관찰을 1차원으로 펼치고 정규화
        obs = obs.flatten()
        self.obs_rms.update(np.expand_dims(obs, 0))
        normalized_obs = (obs - self.obs_rms.mean) / np.sqrt(self.obs_rms.var + 1e-8)
        normalized_obs = np.clip(normalized_obs, -5, 5) # 클리핑

        # 텐서로 변환
        obs_tensor = torch.from_numpy(normalized_obs).float().unsqueeze(0)

        # 타겟과 예측값 계산
        target_features = self.target_network(obs_tensor)
        predictor_features = self.predictor_network(obs_tensor)

        # 내재적 보상 = 예측 오차 (MSE)
        intrinsic_reward = nn.functional.mse_loss(predictor_features, target_features, reduction='none').mean().item()
        
        return intrinsic_reward

    def _update_predictor(self, obs: np.ndarray):
        # 예측 네트워크 업데이트 (학습)
        obs = obs.flatten()
        normalized_obs = (obs - self.obs_rms.mean) / np.sqrt(self.obs_rms.var + 1e-8)
        normalized_obs = np.clip(normalized_obs, -5, 5)
        
        obs_tensor = torch.from_numpy(normalized_obs).float().unsqueeze(0)

        target_features = self.target_network(obs_tensor)
        predictor_features = self.predictor_network(obs_tensor)
        
        loss = nn.functional.mse_loss(predictor_features, target_features)

        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

    def step(self, action):
        obs, reward, terminated, truncated, info = self.env.step(action)
        
        # 1. 내재적 보상 계산
        intrinsic_reward = self._compute_intrinsic_reward(obs)
        self.reward_buffer.append(intrinsic_reward)

        # 2. 보상 정규화 (보상 스케일 안정화)
        if len(self.reward_buffer) > 1:
            mean_rew = np.mean(self.reward_buffer)
            std_rew = np.std(self.reward_buffer)
            intrinsic_reward /= (std_rew + 1e-8)

        # 3. 예측 네트워크 업데이트
        self._update_predictor(obs)

        # 외재적 보상 + 내재적 보상
        total_reward = reward + intrinsic_reward
        
        return obs, total_reward, terminated, truncated, info

    def reset(self, **kwargs):
        return self.env.reset(**kwargs)