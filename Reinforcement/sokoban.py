import pygame
import sys
import random
import numpy as np
from pygame import gfxdraw  # 안티앨리어싱용

# --- 상수 정의 ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
TILE_SIZE = 60
WALL_THICKNESS = 10
AA_SCALE = 4  # 슈퍼샘플링 배율(안티앨리어싱 품질/성능 트레이드오프)

COLOR_BACKGROUND = (240, 235, 220)
COLOR_WALL = (60, 70, 80)
COLOR_PLAYER = (230, 80, 80)
COLOR_BOX = (20, 140, 200)
COLOR_TARGET = (220, 170, 20)
COLOR_BOX_ON_TARGET = (60, 200, 100)
COLOR_TEXT = (50, 50, 50)

# --- 커스텀 이벤트 ---
SUBSCRIBE_EVENT = pygame.USEREVENT + 1      # 클리어 직후 발행되는 구독 이벤트
NEXT_LEVEL_EVENT = pygame.USEREVENT + 2     # 다음 레벨 자동 진행 이벤트
NEXT_LEVEL_DELAY_MS = 1500                  # 몇 ms 뒤 새 게임

def make_aa_rounded_rect(size, color, radius, aa_scale=AA_SCALE):
    """슈퍼샘플링을 이용해 가장자리가 매끈한 둥근 사각형 Surface 생성"""
    w, h = size
    big = pygame.Surface((w * aa_scale, h * aa_scale), pygame.SRCALPHA)
    pygame.draw.rect(
        big, color, pygame.Rect(0, 0, w * aa_scale, h * aa_scale),
        border_radius=radius * aa_scale
    )
    small = pygame.transform.smoothscale(big, (w, h))
    return small

def draw_aa_circle(surface, x, y, r, color):
    """안티앨리어싱 원(플레이어)"""
    gfxdraw.filled_circle(surface, x, y, r, color)
    gfxdraw.aacircle(surface, x, y, r, color)

class SokobanGame:
    def __init__(self):
        self.map_width = 6
        self.map_height = 6
        self.num_boxes = 2

        # 바깥 벽과 닿는 링(가장자리 1칸)에는 박스 생성 금지
        self.box_spawn_margin = 1

        self.screen = None
        self.clock = None
        self.font_small = None

        # 상태/표시 관련
        self._surface_cache = {}
        self.game_state = "playing"
        self.win_event_fired = False
        self.show_subscribe_prompt = False

        self.reset()

    # --- 구독 처리 콜백(원하면 override/수정 가능) ---
    def on_subscribe(self):
        print("[Sokoban] User subscribed!")

    def reset(self):
        """게임을 초기 상태로 리셋"""
        level_data = self._generate_random_level_data()
        self._load_level_from_data(level_data)
        self.game_state = "playing"
        self.win_event_fired = False
        self.show_subscribe_prompt = False
        self._surface_cache.clear()
        return self.get_observation()

    def _generate_random_level_data(self):
        """무작위 레벨 생성 (박스는 가장자리 피함)"""
        all_coords = [(c, r) for c in range(self.map_width) for r in range(self.map_height)]
        inner_coords = [
            (c, r)
            for c in range(self.box_spawn_margin, self.map_width - self.box_spawn_margin)
            for r in range(self.box_spawn_margin, self.map_height - self.box_spawn_margin)
        ]
        box_positions = set(random.sample(inner_coords, self.num_boxes))

        remaining = [p for p in all_coords if p not in box_positions]
        random.shuffle(remaining)
        player_pos = remaining.pop()

        target_positions = set()
        while len(target_positions) < self.num_boxes and remaining:
            target_positions.add(remaining.pop())

        return {"player": player_pos, "boxes": box_positions, "targets": target_positions}

    def _load_level_from_data(self, level_data):
        self.player_pos = level_data["player"]
        self.box_positions = set(level_data["boxes"])
        self.target_positions = set(level_data["targets"])

    def get_observation(self):
        """AI를 위한 숫자 그리드 관찰(observation)"""
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
        """AI 액션 처리"""
        move_map = {0: (0, -1), 1: (0, 1), 2: (-1, 0), 3: (1, 0)}
        dx, dy = move_map[action]

        before = len(self.box_positions.intersection(self.target_positions))
        self._move_player(dx, dy)
        after = len(self.box_positions.intersection(self.target_positions))

        reward = -0.01
        if after > before:
            reward += 10
        elif after < before:
            reward -= 10

        done = self._check_win_condition()
        if done:
            reward += 100

        return self.get_observation(), reward, done

    def _move_player(self, dx, dy):
        """플레이어 이동"""
        px, py = self.player_pos
        npos = (px + dx, py + dy)

        if not (0 <= npos[0] < self.map_width and 0 <= npos[1] < self.map_height):
            return

        if npos in self.box_positions:
            nb = (npos[0] + dx, npos[1] + dy)
            if not (0 <= nb[0] < self.map_width and 0 <= nb[1] < self.map_height) or nb in self.box_positions:
                return
            self.box_positions.remove(npos)
            self.box_positions.add(nb)

        self.player_pos = npos

    def _check_win_condition(self):
        return self.box_positions == self.target_positions

    # ---- 렌더링 캐시 ----
    def _cached_tile(self, key, color, radius):
        if key not in self._surface_cache:
            surf = make_aa_rounded_rect((TILE_SIZE, TILE_SIZE), color, radius)
            if pygame.get_init() and pygame.display.get_init():
                surf = surf.convert_alpha()
            self._surface_cache[key] = surf
        return self._surface_cache[key]

    def render(self, surface):
        """현재 게임 상태를 그림"""
        surface.fill(COLOR_BACKGROUND)
        map_w_px = self.map_width * TILE_SIZE
        map_h_px = self.map_height * TILE_SIZE
        offset_x = (SCREEN_WIDTH - map_w_px) // 2
        offset_y = (SCREEN_HEIGHT - map_h_px) // 2

        # 외곽 벽 프레임
        wall_frame_rect = pygame.Rect(offset_x, offset_y, map_w_px, map_h_px).inflate(WALL_THICKNESS + 10, WALL_THICKNESS + 10)
        pygame.draw.rect(surface, COLOR_WALL, wall_frame_rect, width=WALL_THICKNESS, border_radius=15)

        def to_px(pos):
            return (offset_x + pos[0] * TILE_SIZE, offset_y + pos[1] * TILE_SIZE)

        rr = max(8, TILE_SIZE // 6)
        target_tile = self._cached_tile(("target", TILE_SIZE), COLOR_TARGET, rr)
        box_tile = self._cached_tile(("box", TILE_SIZE), COLOR_BOX, rr)
        box_on_target_tile = self._cached_tile(("box_on_target", TILE_SIZE), COLOR_BOX_ON_TARGET, rr)

        for pos in self.target_positions:
            px, py = to_px(pos)
            surface.blit(target_tile, (px, py))

        for pos in self.box_positions:
            px, py = to_px(pos)
            tile = box_on_target_tile if pos in self.target_positions else box_tile
            surface.blit(tile, (px, py))

        # 플레이어(AA 원)
        px, py = to_px(self.player_pos)
        cx = px + TILE_SIZE // 2
        cy = py + TILE_SIZE // 2
        pr = TILE_SIZE // 2 - 5
        draw_aa_circle(surface, cx, cy, pr, COLOR_PLAYER)

        # 클리어/구독 오버레이
        if self.show_subscribe_prompt and self.font_small:
            msg1 = self.font_small.render("LEVEL CLEAR!", True, (0, 150, 0))
            msg2 = self.font_small.render("Press S to Subscribe", True, COLOR_TEXT)
            surface.blit(msg1, (SCREEN_WIDTH // 2 - msg1.get_width() // 2, 20))
            surface.blit(msg2, (SCREEN_WIDTH // 2 - msg2.get_width() // 2, 60))
        elif self._check_win_condition() and self.font_small:
            # 타이머 대기 중에도 상단에 간단히 표시
            msg = self.font_small.render("LEVEL CLEAR!", True, (0, 150, 0))
            surface.blit(msg, (SCREEN_WIDTH // 2 - msg.get_width() // 2, 20))

    def run_for_human(self):
        """사람 플레이용 메인 루프"""
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Sokoban by Human (Rounded + AA + Subscribe)")
        self.clock = pygame.time.Clock()
        self.font_small = pygame.font.Font(None, 36)

        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

                # --- 커스텀 이벤트 처리 ---
                if event.type == SUBSCRIBE_EVENT:
                    # 구독 안내 표시 시작 + 다음 레벨 타이머 가동
                    self.show_subscribe_prompt = True
                    pygame.time.set_timer(NEXT_LEVEL_EVENT, NEXT_LEVEL_DELAY_MS, True)

                if event.type == NEXT_LEVEL_EVENT:
                    # 자동으로 새 게임
                    self.reset()
                    # 타이머 해제(안전)
                    pygame.time.set_timer(NEXT_LEVEL_EVENT, 0)

                # --- 키 입력 ---
                if event.type == pygame.KEYDOWN:
                    dx, dy = 0, 0
                    if event.key == pygame.K_UP: dx, dy = 0, -1
                    elif event.key == pygame.K_DOWN: dx, dy = 0, 1
                    elif event.key == pygame.K_LEFT: dx, dy = -1, 0
                    elif event.key == pygame.K_RIGHT: dx, dy = 1, 0
                    elif event.key == pygame.K_r: self.reset()

                    if dx != 0 or dy != 0:
                        self._move_player(dx, dy)

            # 렌더
            self.render(self.screen)

            # 승리 감지 → 이벤트 1회 발행
            if self._check_win_condition() and not self.win_event_fired:
                self.win_event_fired = True
                pygame.event.post(pygame.event.Event(SUBSCRIBE_EVENT))

            pygame.display.flip()
            self.clock.tick(30)

# 단독 실행 시
if __name__ == '__main__':
    game = SokobanGame()
    game.run_for_human()
