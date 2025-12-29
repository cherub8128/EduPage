#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Tracker CSV 분석 템플릿
- 자유낙하(공/쇠구슬 등): y(t)=a t^2 + b t + c 를 최소제곱으로 적합 -> g 추정
- 셔틀콕(제곱저항 가정): a = g - (g/vT^2) v^2  를 선형회귀로 적합 -> vT 추정

사용 예:
  python tracker_fit_template.py ball.csv shuttle.csv

주의:
- Tracker에서 y축 방향(위/아래)을 어떻게 잡았는지에 따라 g 부호가 달라집니다.
- CSV의 열 이름은 Tracker 버전/설정에 따라 다를 수 있습니다. 아래 find_col()이 최대한 자동으로 찾습니다.
"""
import sys
import math
import pandas as pd
import numpy as np

def find_col(df, candidates):
    """
    df.columns 중에서 candidates(접두사/부분문자열) 중 하나를 포함하는 첫 컬럼을 찾습니다.
    """
    cols = list(df.columns)
    low = [c.lower().strip() for c in cols]
    for cand in candidates:
        cand = cand.lower()
        for i, c in enumerate(low):
            if c == cand or c.startswith(cand) or (cand in c):
                return cols[i]
    return None

def r2_score(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    ss_res = np.sum((y_true - y_pred)**2)
    ss_tot = np.sum((y_true - np.mean(y_true))**2)
    return 1 - ss_res/ss_tot if ss_tot != 0 else float("nan")

def fit_free_fall(csv_path):
    df = pd.read_csv(csv_path)
    tcol = find_col(df, ["t", "time"])
    ycol = find_col(df, ["y", "y (m)", "y_m"])
    if tcol is None or ycol is None:
        raise ValueError(f"[{csv_path}] 시간/위치 열을 찾지 못했습니다. columns={list(df.columns)}")

    t = df[tcol].to_numpy(dtype=float)
    y = df[ycol].to_numpy(dtype=float)

    # 2차 회귀: y = a t^2 + b t + c
    A = np.vstack([t**2, t, np.ones_like(t)]).T
    coef, *_ = np.linalg.lstsq(A, y, rcond=None)
    a, b, c = coef
    yhat = A @ coef
    r2 = r2_score(y, yhat)

    g_est = 2*a  # y축을 아래쪽 +로 잡으면 g_est ~ +9.8, 위쪽 +면 g_est ~ -9.8
    return {
        "tcol": tcol, "ycol": ycol,
        "a": a, "b": b, "c": c,
        "g_est": g_est,
        "r2": r2,
        "n": len(t)
    }

def fit_shuttle_quadratic_drag(csv_path):
    df = pd.read_csv(csv_path)
    # 가능한 열 이름 후보(Tracker에서 흔함)
    tcol = find_col(df, ["t", "time"])
    vycol = find_col(df, ["vy", "v_y", "y velocity", "vy (m/s)"])
    aycol = find_col(df, ["ay", "a_y", "y acceleration", "ay (m/s^2)"])

    # y만 있는 경우: vy/ay는 Tracker에서 자동 계산을 켜서 내보내는 것이 좋습니다.
    if tcol is None or vycol is None or aycol is None:
        raise ValueError(f"[{csv_path}] t/vy/ay 열을 찾지 못했습니다. columns={list(df.columns)}")

    v = df[vycol].to_numpy(dtype=float)
    a = df[aycol].to_numpy(dtype=float)

    # Tracker 가속도는 잡음이 심할 수 있어, 너무 초반(정렬/흔들림)과 너무 끝(바닥 충돌 직전) 구간을 제거하는 게 좋습니다.
    # 여기서는 단순히 이상치 제거: NaN/inf 제거 + 속도 상위/하위 2% 컷
    mask = np.isfinite(v) & np.isfinite(a)
    v = v[mask]; a = a[mask]
    if len(v) < 10:
        raise ValueError("유효 데이터가 너무 적습니다.")
    lo, hi = np.quantile(v, [0.02, 0.98])
    mask2 = (v >= lo) & (v <= hi)
    v = v[mask2]; a = a[mask2]

    v2 = v**2
    X = np.vstack([np.ones_like(v2), v2]).T  # a = b0 + b1 v^2
    coef, *_ = np.linalg.lstsq(X, a, rcond=None)
    b0, b1 = coef  # b0~g, b1~-(g/vT^2)
    ahat = X @ coef
    r2 = r2_score(a, ahat)

    # vT 추정 (b1은 음수여야 함)
    vT = math.sqrt(-b0/b1) if (b1 < 0 and b0 > 0) else float("nan")
    k = -b1  # a = g - k v^2 형태로 보면 k ≈ -b1

    return {
        "tcol": tcol, "vycol": vycol, "aycol": aycol,
        "g_intercept": b0,
        "slope": b1,
        "vT_est": vT,
        "k_est": k,
        "r2": r2,
        "n": len(v)
    }

def main():
    if len(sys.argv) < 3:
        print("사용법: python tracker_fit_template.py ball.csv shuttle.csv")
        sys.exit(1)

    ball_csv = sys.argv[1]
    shuttle_csv = sys.argv[2]

    ff = fit_free_fall(ball_csv)
    print("=== 자유낙하(무저항 근사) ===")
    print(f"사용 열: t={ff['tcol']}, y={ff['ycol']}  (n={ff['n']})")
    print(f"회귀식: y = a t^2 + b t + c")
    print(f"a={ff['a']:.6g}, b={ff['b']:.6g}, c={ff['c']:.6g}")
    print(f"g 추정값 g=2a = {ff['g_est']:.4f} m/s^2  (부호는 y축 방향에 따라 달라짐)")
    print(f"R^2 = {ff['r2']:.5f}\n")

    sh = fit_shuttle_quadratic_drag(shuttle_csv)
    print("=== 셔틀콕(제곱저항 선형화: a = g - (g/vT^2) v^2) ===")
    print(f"사용 열: vy={sh['vycol']}, ay={sh['aycol']}  (n={sh['n']})")
    print(f"회귀식: a = b0 + b1 v^2")
    print(f"b0(절편) ≈ g = {sh['g_intercept']:.4f} m/s^2")
    print(f"b1(기울기) ≈ -(g/vT^2) = {sh['slope']:.6f} 1/m")
    print(f"vT 추정값 vT = sqrt(-b0/b1) = {sh['vT_est']:.4f} m/s")
    print(f"k 추정값( a=g-k v^2 에서 ) k ≈ {-sh['slope']:.6f} 1/m")
    print(f"R^2 = {sh['r2']:.5f}")

if __name__ == "__main__":
    main()
