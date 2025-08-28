# Colab 셀 1
# 드라이브 마운트하기
from google.colab import drive
drive.mount('/content/drive')

# Colab 셀 2
# 필요한 모듈 설치
!pip install "stable-baselines3[extra]>=2.0.0a5" gymnasium pygame > /dev/null 2>&1

# Colab 셀 3
# 현재 작업 폴더를 기본로 경로 추가하기
import sys
project_path = '/content/drive/MyDrive/Sokoban'
if project_path not in sys.path:
    sys.path.append(project_path)
    print(f"'{project_path}' 경로가 sys.path에 추가되었습니다.")

# Colab 셀 4
# AI 훈련시키기
import os
import torch
import torch.nn as nn
from gymnasium import spaces

from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from stable_baselines3.common.callbacks import CheckpointCallback

# 현재 경로에 있는 커스텀 모듈들을 import 합니다.
from rnd_wrapper import RNDRewardWrapper 
from sokoban_env import SokobanEnv

# ------------------------------------------------------------------------------
# 1. CustomCNN 클래스 정의
# 모델을 저장하고 불러올 때 일관성을 유지하기 위해 학습 스크립트에 직접 정의합니다.
# ------------------------------------------------------------------------------
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

# ------------------------------------------------------------------------------
# 2. 환경 생성 헬퍼 함수
# ------------------------------------------------------------------------------
def make_env(log_dir):
    def _init():
        env = SokobanEnv()
        # RND 래퍼를 적용하여 탐험 보상을 추가합니다.
        env = RNDRewardWrapper(env, lr=1e-4, feature_dim=128, intrinsic_reward_coef=0.001)
        # Monitor 래퍼로 감싸 텐서보드에 보상 등을 기록합니다.
        env = Monitor(env, log_dir)
        return env
    return _init

# ------------------------------------------------------------------------------
# 3. 메인 학습 로직
# ------------------------------------------------------------------------------
if __name__ == '__main__':
    # --- 경로 설정 ---
    log_dir = "sokoban_logs/"
    tensorboard_log_dir = "sokoban_tensorboard/"
    model_save_path = "sokoban_models/"

    os.makedirs(log_dir, exist_ok=True)
    os.makedirs(tensorboard_log_dir, exist_ok=True)
    os.makedirs(model_save_path, exist_ok=True)

    # --- 환경 생성 ---
    env = DummyVecEnv([make_env(log_dir)])

    # --- 정책 설정 ---
    policy_kwargs = dict(
        features_extractor_class=CustomCNN,
        features_extractor_kwargs=dict(features_dim=128),
    )

    # --- 모델 로드 또는 새로 생성 ---
    final_model_path = os.path.join(model_save_path, "sokoban_final_model.zip")

    if os.path.exists(final_model_path):
        # 최종 모델 파일이 존재하면 불러와서 학습을 이어갑니다.
        print(f"'{final_model_path}' 에서 기존 모델을 불러옵니다. 이어서 학습을 시작합니다.")
        model = PPO.load(final_model_path, env=env, tensorboard_log=tensorboard_log_dir)
    else:
        # 최종 모델 파일이 없으면 새로 생성합니다.
        print("저장된 모델이 없습니다. 처음부터 학습을 시작합니다.")
        model = PPO(
            "CnnPolicy",
            env,
            policy_kwargs=policy_kwargs,
            verbose=1,
            tensorboard_log=tensorboard_log_dir,
            learning_rate=3e-4,
            n_steps=2048,
            batch_size=128,
            n_epochs=10,
            gamma=0.99,
            ent_coef=0.01,
        )
    
    # --- 콜백 설정 (주기적 모델 저장) ---
    checkpoint_callback = CheckpointCallback(
        save_freq=50000,
        save_path=model_save_path,
        name_prefix="sokoban_checkpoint_model"
    )

    # --- 학습 실행 ---
    # ❗❗❗ 여기서 원하는 학습량을 설정하세요. ❗❗❗
    TOTAL_TIMESTEPS = 5_000_000
    
    print(f"--- {TOTAL_TIMESTEPS:,} 타임스텝 학습 시작 ---")
    model.learn(
        total_timesteps=TOTAL_TIMESTEPS,
        callback=checkpoint_callback,
        progress_bar=True,
        reset_num_timesteps=False # True이면 새로 학습, False이면 이어서 학습
    )

    # --- 최종 모델 저장 ---
    # 항상 같은 이름으로 저장하여 다음 실행 시 이어할 수 있도록 합니다.
    model.save(final_model_path)
    
    env.close()

    # --- 완료 메시지 ---
    print("\n" + "="*50)
    print("🎉 학습이 성공적으로 완료되었습니다!")
    print(f"최종 모델은 '{final_model_path}'에 저장되었습니다.")
    print("학습 과정을 확인하려면 아래 명령어를 터미널에 입력하세요:")
    print(f"tensorboard --logdir={tensorboard_log_dir}")
    print("="*50)