import pygame
import time
import sys
import torch
import torch.nn as nn
from gymnasium import spaces

from stable_baselines3 import PPO
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor

from sokoban_env import SokobanEnv

# ------------------------------------------------------------------------------
# CustomCNN 클래스 정의
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
# 모델 경로 설정
# ------------------------------------------------------------------------------
MODEL_PATH = "sokoban_models_rnd_manual/sokoban_rnd_manual_final.zip"

# ------------------------------------------------------------------------------

def main():
    print("환경을 생성하고 모델을 불러옵니다...")
    try:
        env = SokobanEnv(render_mode="human")
    except Exception as e:
        print(f"환경 생성 중 오류 발생: {e}")
        return

    try:
        model = PPO.load(MODEL_PATH, env=env)
        print(f"'{MODEL_PATH}'에서 모델을 성공적으로 불러왔습니다.")
    except Exception as e:
        print(f"모델 로딩 중 오류 발생: {e}")
        return

    # --- 여기가 수정된 부분 1 ---
    # Pygame Clock 객체를 생성합니다.
    clock = pygame.time.Clock()

    obs, _ = env.reset()
    print("\n--- 에이전트 플레이 시작 ---")
    print("게임을 중단하려면 Pygame 창을 닫거나 Ctrl+C를 누르세요.")

    try:
        while True:
            env.render()

            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action.item())
            
            if terminated or truncated:
                print("에피소드 완료. 2초 후 리셋합니다.")
                env.render()
                time.sleep(2) # 리셋 전 잠시 대기
                obs, _ = env.reset()
            
            # --- 여기가 수정된 부분 2 ---
            # time.sleep() 대신 clock.tick()을 사용해 프레임 속도를 제어합니다. (e.g., 30 FPS)
            clock.tick(30)
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    env.close()
                    return

    except KeyboardInterrupt:
        print("\n사용자가 프로그램을 중단했습니다.")
    finally:
        env.close()
        print("--- 플레이 종료 ---")


if __name__ == '__main__':
    main()