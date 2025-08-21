import pygame
import sys
import random
import numpy as np

# --- 상수 정의 ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
TILE_SIZE = 60
WALL_THICKNESS = 10
COLOR_BACKGROUND = (240, 235, 220)
COLOR_WALL = (60, 70, 80)
COLOR_PLAYER = (230, 80, 80)
COLOR_BOX = (20, 140, 200)
COLOR_TARGET = (220, 170, 20)
COLOR_BOX_ON_TARGET = (60, 200, 100)
COLOR_TEXT = (50, 50, 50)

class SokobanGame:
    def __init__(self):
        self.map_width = 5
        self.map_height = 5
        self.num_boxes = 2
        self.screen = None # 렌더링을 위한 screen 객체
        self.clock = None
        self.font_small = None
        self.reset()

    def reset(self):
        """게임을 초기 상태로 리셋합니다."""
        level_data = self._generate_random_level_data()
        self._load_level_from_data(level_data)
        self.game_state = "playing"
        return self.get_observation()

    def _generate_random_level_data(self):
        # (기존 코드와 동일)
        all_coords = [(c, r) for c in range(self.map_width) for r in range(self.map_height)]
        random.shuffle(all_coords)
        player_pos = all_coords.pop()
        target_positions = {all_coords.pop() for _ in range(self.num_boxes)}
        box_positions = {all_coords.pop() for _ in range(self.num_boxes)}
        return {"player": player_pos, "boxes": box_positions, "targets": target_positions}

    def _load_level_from_data(self, level_data):
        self.player_pos = level_data["player"]
        self.box_positions = set(level_data["boxes"])
        self.target_positions = set(level_data["targets"])

    def get_observation(self):
        """AI를 위한 숫자 그리드 관찰(observation)을 생성합니다."""
        grid = np.zeros((self.map_height, self.map_width), dtype=np.uint8)
        # 0: 빈 공간, 1: 플레이어, 2: 박스, 3: 목표, 4: 목표 위의 박스
        for r in range(self.map_height):
            for c in range(self.map_width):
                pos = (c, r)
                if pos in self.target_positions:
                    grid[r, c] = 3
                if pos in self.box_positions:
                    grid[r, c] = 2
                if pos in self.target_positions and pos in self.box_positions:
                    grid[r, c] = 4
        
        player_r, player_c = self.player_pos[1], self.player_pos[0]
        grid[player_r, player_c] = 1
        return grid

    def step(self, action):
        """AI의 행동(action)을 받아 게임을 한 단계 진행시키고 결과를 반환합니다."""
        move_map = {0: (0, -1), 1: (0, 1), 2: (-1, 0), 3: (1, 0)} # 상, 하, 좌, 우
        dx, dy = move_map[action]

        boxes_on_target_before = len(self.box_positions.intersection(self.target_positions))
        
        self._move_player(dx, dy)
        
        boxes_on_target_after = len(self.box_positions.intersection(self.target_positions))

        # 보상 계산
        reward = -0.01 # 움직임 페널티
        if boxes_on_target_after > boxes_on_target_before:
            reward += 10
        elif boxes_on_target_after < boxes_on_target_before:
            reward -= 10
        
        done = self._check_win_condition()
        if done:
            reward += 100
            
        return self.get_observation(), reward, done

    def _move_player(self, dx, dy):
        """내부 플레이어 이동 로직"""
        px, py = self.player_pos
        next_player_pos = (px + dx, py + dy)

        if not (0 <= next_player_pos[0] < self.map_width and 0 <= next_player_pos[1] < self.map_height):
            return

        if next_player_pos in self.box_positions:
            next_box_pos = (next_player_pos[0] + dx, next_player_pos[1] + dy)
            if not (0 <= next_box_pos[0] < self.map_width and 0 <= next_box_pos[1] < self.map_height) or \
               next_box_pos in self.box_positions:
                return
            
            self.box_positions.remove(next_player_pos)
            self.box_positions.add(next_box_pos)
        
        self.player_pos = next_player_pos

    def _check_win_condition(self):
        return self.box_positions == self.target_positions

    def render(self, surface):
        """주어진 surface에 현재 게임 상태를 그립니다."""
        surface.fill(COLOR_BACKGROUND)
        map_w_px = self.map_width * TILE_SIZE
        map_h_px = self.map_height * TILE_SIZE
        offset_x = (SCREEN_WIDTH - map_w_px) // 2
        offset_y = (SCREEN_HEIGHT - map_h_px) // 2
        
        wall_frame_rect = pygame.Rect(offset_x, offset_y, map_w_px, map_h_px).inflate(WALL_THICKNESS+10, WALL_THICKNESS+10)
        pygame.draw.rect(surface, COLOR_WALL, wall_frame_rect, width=WALL_THICKNESS, border_radius=15)
        
        def to_pixel_coords(grid_pos):
            return (offset_x + grid_pos[0] * TILE_SIZE, offset_y + grid_pos[1] * TILE_SIZE)

        for pos in self.target_positions:
            pygame.draw.rect(surface, COLOR_TARGET, (*to_pixel_coords(pos), TILE_SIZE, TILE_SIZE))
        for pos in self.box_positions:
            color = COLOR_BOX_ON_TARGET if pos in self.target_positions else COLOR_BOX
            pygame.draw.rect(surface, color, (*to_pixel_coords(pos), TILE_SIZE, TILE_SIZE))
        
        px, py = to_pixel_coords(self.player_pos)
        pygame.draw.circle(surface, COLOR_PLAYER, (px + TILE_SIZE//2, py + TILE_SIZE//2), TILE_SIZE//2 - 5)

    def run_for_human(self):
        """사람이 플레이할 때 사용하는 메인 루프"""
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Sokoban by Human")
        self.clock = pygame.time.Clock()
        self.font_small = pygame.font.Font(None, 36)

        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    dx, dy = 0, 0
                    if event.key == pygame.K_UP: dx, dy = 0, -1
                    elif event.key == pygame.K_DOWN: dx, dy = 0, 1
                    elif event.key == pygame.K_LEFT: dx, dy = -1, 0
                    elif event.key == pygame.K_RIGHT: dx, dy = 1, 0
                    elif event.key == pygame.K_r: self.reset()
                    
                    if dx != 0 or dy != 0:
                        self._move_player(dx, dy)

            self.render(self.screen)
            
            if self._check_win_condition():
                # 간단한 승리 메시지 표시
                win_text = self.font_small.render("LEVEL CLEAR!", True, (0,150,0))
                self.screen.blit(win_text, (SCREEN_WIDTH//2 - win_text.get_width()//2, 20))

            pygame.display.flip()
            self.clock.tick(30)

# 이 파일을 직접 실행하면 사람이 플레이할 수 있습니다.
if __name__ == '__main__':
    game = SokobanGame()
    game.run_for_human()