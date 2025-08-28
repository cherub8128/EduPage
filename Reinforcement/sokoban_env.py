import gymnasium as gym
from gymnasium import spaces
import numpy as np
from sokoban_game import SokobanGame # 게임 클래스 import
import pygame # pygame을 import해야 display를 사용할 수 있습니다.

class SokobanEnv(gym.Env):
    def __init__(self, render_mode=None):
        super().__init__()
        self.game = SokobanGame()
        self.render_mode = render_mode
        self.steps_taken = 0
        self._surface = None # surface를 인스턴스 변수로 초기화

        self.action_space = spaces.Discrete(4)
        self.observation_space = spaces.Box(
            low=0, high=4,
            shape=(1, self.game.map_height, self.game.map_width),
            dtype=np.uint8
        )

    def step(self, action):
        obs, reward, terminated = self.game.step(action)
        self.steps_taken += 1
        truncated = self.steps_taken >= 200
        obs_with_channel = np.expand_dims(obs, axis=0)
        return obs_with_channel, reward, terminated, truncated, {}

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.steps_taken = 0
        obs = self.game.reset()
        obs_with_channel = np.expand_dims(obs, axis=0)
        return obs_with_channel, {}

    def render(self):
        if self.render_mode == "human":
            # Pygame 창(surface)이 없으면 생성합니다.
            if self._surface is None:
                pygame.init()
                pygame.display.set_caption("Sokoban AI")
                self._surface = pygame.display.set_mode((800, 600))
            
            # 게임 로직을 사용해 surface에 그림을 그립니다.
            self.game.render(self._surface)
            
            # --- 여기가 수정된 부분 ---
            # 메모리에 그려진 그림을 실제 화면으로 업데이트(갱신)합니다.
            pygame.display.flip() # <<-- 이 줄 추가

    def close(self):
        if self._surface is not None:
            pygame.display.quit()
            pygame.quit()
            self._surface = None