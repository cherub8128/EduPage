import os
import torch
import torch.nn as nn
from gymnasium import spaces

from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from stable_baselines3.common.callbacks import CheckpointCallback

from rnd_wrapper import RNDRewardWrapper 
from sokoban_env import SokobanEnv

class CustomCNN(BaseFeaturesExtractor):
    def __init__(self, observation_space: spaces.Box, features_dim: int = 128):
        super().__init__(observation_space, features_dim)
        n_input_channels = observation_space.shape[0]
        self.cnn = nn.Sequential(
            nn.Conv2d(n_input_channels, 32, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.Flatten(),
        )
        with torch.no_grad():
            n_flatten = self.cnn(
                torch.as_tensor(observation_space.sample()[None]).float()
            ).shape[1]
        self.linear = nn.Sequential(nn.Linear(n_flatten, features_dim), nn.ReLU())

    def forward(self, observations: torch.Tensor) -> torch.Tensor:
        return self.linear(self.cnn(observations))


# 환경 생성을 위한 헬퍼 함수
def make_env(log_dir):
    def _init():
        env = SokobanEnv()
        # RND 래퍼를 적용합니다.
        env = RNDRewardWrapper(env, lr=1e-4, feature_dim=128)
        env = Monitor(env, log_dir)
        return env
    return _init

if __name__ == '__main__':
    log_dir = "sokoban_logs_rnd_manual/"
    tensorboard_log_dir = "sokoban_tensorboard_rnd_manual/"
    model_save_path = "sokoban_models_rnd_manual/"

    os.makedirs(log_dir, exist_ok=True)
    os.makedirs(tensorboard_log_dir, exist_ok=True)
    os.makedirs(model_save_path, exist_ok=True)

    env = DummyVecEnv([make_env(log_dir)])

    policy_kwargs = dict(
        features_extractor_class=CustomCNN,
        features_extractor_kwargs=dict(features_dim=128),
    )

    # RND 래퍼가 보상을 처리해주므로, 일반 PPO 모델을 사용합니다.
    model = PPO(
        "CnnPolicy",
        env,
        policy_kwargs=policy_kwargs,
        verbose=1,
        tensorboard_log=tensorboard_log_dir,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=128, # RND 사용 시 배치 사이즈를 늘리면 안정적일 수 있습니다.
        n_epochs=10,
        gamma=0.99,
        ent_coef=0.01,
    )
    
    checkpoint_callback = CheckpointCallback(
        save_freq=50000,
        save_path=model_save_path,
        name_prefix="sokoban_rnd_manual_model"
    )

    print("--- 직접 구현한 RND를 사용한 학습 시작 ---")
    model.learn(
        total_timesteps=1_000_000,
        callback=checkpoint_callback,
        progress_bar=True
    )

    final_model_path = os.path.join(model_save_path, "sokoban_rnd_manual_final")
    model.save(final_model_path)
    
    env.close()

    print("\n" + "="*50)
    print("🎉 학습이 성공적으로 완료되었습니다!")
    print(f"최종 모델은 '{final_model_path}.zip'에 저장되었습니다.")
    print("학습 과정을 확인하려면 아래 명령어를 터미널에 입력하세요:")
    print(f"tensorboard --logdir={tensorboard_log_dir}")
    print("="*50)