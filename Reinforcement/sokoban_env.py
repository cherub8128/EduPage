import gymnasium as gym
from gymnasium import spaces
import numpy as np
from sokoban_game import SokobanGame # 게임 클래스 import

class SokobanEnv(gym.Env):
    def __init__(self, render_mode=None):
        super().__init__()
        self.game = SokobanGame()
        self.render_mode = render_mode
        self.steps_taken = 0

        self.action_space = spaces.Discrete(4)

        # --- 수정된 부분 1: 관찰 공간에 '채널' 차원 추가 ---
        # CnnPolicy가 인식할 수 있도록 (높이, 너비) -> (1, 높이, 너비) 형태로 변경
        self.observation_space = spaces.Box(
            low=0, high=4,
            shape=(1, self.game.map_height, self.game.map_width), # shape 변경
            dtype=np.uint8
        )

    def step(self, action):
        obs, reward, terminated = self.game.step(action)
        self.steps_taken += 1
        truncated = self.steps_taken >= 200

        if self.render_mode == "human":
            self.game.render(self._surface) if hasattr(self, "_surface") else None

        # --- 수정된 부분 2: 반환하는 관찰 데이터에 채널 차원 추가 ---
        obs_with_channel = np.expand_dims(obs, axis=0)
        return obs_with_channel, reward, terminated, truncated, {}

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.steps_taken = 0
        obs = self.game.reset()

        # --- 수정된 부분 3: 리셋 시 반환하는 관찰 데이터에도 채널 차원 추가 ---
        obs_with_channel = np.expand_dims(obs, axis=0)
        return obs_with_channel, {}

    def render(self):
        if self.render_mode == "human":
            if not hasattr(self, "_surface"):
                import pygame
                pygame.init()
                self._surface = pygame.display.set_mode((800, 600))
            self.game.render(self._surface)

    def close(self):
        try:
            import pygame
            pygame.quit()
        except ImportError:
            pass