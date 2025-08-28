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

# CNN 만들어보기
class CustomCNN(BaseFeaturesExtractor):
    pass


# 환경 생성을 위한 헬퍼 함수
def make_env(log_dir):
    def _init():
        env = SokobanEnv()
        # RND로 감싸기

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

    final_model_path = os.path.join(model_save_path, "sokoban_rnd_manual_final.zip")

    if os.path.exists(final_model_path):
        # 모델 파일이 존재하면 불러와서 학습을 이어갑니다.
        print(f"'{final_model_path}' 에서 기존 모델을 불러옵니다. 이어서 학습을 시작합니다.")
        model = PPO.load(final_model_path, env=env, tensorboard_log=tensorboard_log_dir)
        # model.set_env(env) # PPO.load에 env를 전달하면 이 줄은 필요 없습니다.

    else:
        # 모델 파일이 없으면 새로 생성합니다.
        print("저장된 모델이 없습니다. 처음부터 학습을 시작합니다.")
        model = PPO(
            "CnnPolicy",
            env,
            tensorboard_log=tensorboard_log_dir,
            verbose=1,
            
            # 직접 하이퍼 파라미터를 지정해보자
        )
    
    checkpoint_callback = CheckpointCallback(
        save_freq=50000,
        save_path=model_save_path,
        name_prefix="sokoban_rnd_manual_model"
    )

    print("--- 500만 타임스텝 추가 학습 시작 ---")
    model.learn(
        total_timesteps=5_000_000, # 학습 목표를 500만으로 설정
        callback=checkpoint_callback,
        progress_bar=True,
        reset_num_timesteps=False # 이어서 학습할 경우 타임스텝을 리셋하지 않음
    )

    # 항상 최종 모델을 같은 이름으로 저장하여 이어하기가 가능하도록 합니다.
    model.save(final_model_path)
    
    env.close()

    print("\n" + "="*50)
    print("🎉 학습이 성공적으로 완료되었습니다!")
    print(f"최종 모델은 '{final_model_path}.zip'에 저장되었습니다.")
    print("학습 과정을 확인하려면 아래 명령어를 터미널에 입력하세요:")
    print(f"tensorboard --logdir={tensorboard_log_dir}")
    print("="*50)