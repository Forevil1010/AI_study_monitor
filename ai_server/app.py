from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import mediapipe as mp
import base64
import requests
import time
import os
from urllib.request import urlretrieve

app = Flask(__name__)
CORS(app)

# ====================== MediaPipe Tasks 初始化（兼容 Python3.12 / mp 0.10.33） ======================
# MediaPipe 在 Windows 某些版本下对非 ASCII 路径兼容较差，这里固定到纯英文目录
MODEL_DIR = os.environ.get("MP_MODEL_DIR", "C:/mediapipe_models")
POSE_MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_lite.task")
HAND_MODEL_PATH = os.path.join(MODEL_DIR, "hand_landmarker.task")

POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"


def ensure_model(path, url):
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(path):
        urlretrieve(url, path)


def init_landmarkers():
    ensure_model(POSE_MODEL_PATH, POSE_MODEL_URL)
    ensure_model(HAND_MODEL_PATH, HAND_MODEL_URL)

    base_options_pose = mp.tasks.BaseOptions(model_asset_path=POSE_MODEL_PATH)
    pose_options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=base_options_pose,
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    pose_landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(pose_options)

    base_options_hand = mp.tasks.BaseOptions(model_asset_path=HAND_MODEL_PATH)
    hand_options = mp.tasks.vision.HandLandmarkerOptions(
        base_options=base_options_hand,
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(hand_options)
    return pose_landmarker, hand_landmarker


pose, hands = init_landmarkers()

# ====================== 业务逻辑（完全不变） ======================
LABELS = {
    0: "专注学习",
    1: "刷手机",
    2: "东张西望",
    3: "低头/睡觉",
    4: "交谈"
}

stats = {
    "focus_count": 0,
    "phone_count": 0,
    "look_count": 0,
    "head_down_count": 0,
    "talk_count": 0,
    "last_class": 0,
    "start_time": time.time()
}

def update_stats(class_id):
    if class_id == 0: stats["focus_count"] += 1
    if class_id == 1: stats["phone_count"] += 1
    if class_id == 2: stats["look_count"] += 1
    if class_id == 3: stats["head_down_count"] += 1
    if class_id == 4: stats["talk_count"] += 1
    stats["last_class"] = class_id

def get_suggestion():
    suggestions = []
    if stats["phone_count"] > 3:
        suggestions.append("检测到多次使用手机，请保持专注")
    if stats["head_down_count"] > 3:
        suggestions.append("请勿长时间低头，注意坐姿")
    if stats["talk_count"] > 2:
        suggestions.append("学习期间请避免交谈，提高效率")
    if not suggestions:
        suggestions.append("学习状态良好，继续保持！")
    return suggestions

# 百度AI配置
BAIDU_API_KEY = "9p1hRVi1C5ujQQYRi9nHxaHk"
BAIDU_SECRET_KEY = "owjwfzvsiw0INI5k5PsyinAeQcpXrfT6"

def get_baidu_token():
    try:
        url = "https://aip.baidubce.com/oauth/2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": BAIDU_API_KEY,
            "client_secret": BAIDU_SECRET_KEY
        }
        res = requests.post(url, data=data)
        return res.json().get("access_token")
    except:
        return None

def baidu_analyse(img_base64):
    token = get_baidu_token()
    if not token:
        return None
    try:
        url = f"https://aip.baidubce.com/rest/2.0/image-classify/v1/body_analysis"
        params = {"access_token": token}
        data = {"image": img_base64}
        res = requests.post(url, params=params, data=data)
        return res.json()
    except:
        return None

# 分心检测逻辑（完全保留你的算法）
def detect_distraction(pose_results, hand_results):
    if not pose_results.pose_landmarks:
        return 0, 0.9

    one_pose = pose_results.pose_landmarks[0]
    pose_enum = mp.tasks.vision.PoseLandmark
    nose = one_pose[pose_enum.NOSE]
    left_eye = one_pose[pose_enum.LEFT_EYE]
    right_eye = one_pose[pose_enum.RIGHT_EYE]
    eye_mid_x = (left_eye.x + right_eye.x) / 2

    if (nose.y > 0.56) and (abs(eye_mid_x - 0.5) < 0.14):
        return 3, 0.85
    elif abs(eye_mid_x - 0.5) > 0.24:
        return 4, 0.80
    elif abs(eye_mid_x - 0.5) > 0.14:
        return 2, 0.82

    if hand_results.hand_landmarks:
        for h_land in hand_results.hand_landmarks:
            xs = [lm.x for lm in h_land]
            ys = [lm.y for lm in h_land]
            cx = (min(xs) + max(xs)) / 2
            cy = (min(ys) + max(ys)) / 2
            h = max(ys) - min(ys)
            if abs(cx - nose.x) < 0.25 and cy > nose.y and cy < nose.y + 0.35 and h > 0.1:
                return 1, 0.88

    return 0, 0.9

# ====================== Flask 接口 ======================
@app.route('/detect', methods=['POST'])
def detect():
    data = request.json
    img_b64 = data['image'].split(',')[1]
    img_data = base64.b64decode(img_b64)
    img = cv2.imdecode(np.frombuffer(img_data, dtype=np.uint8), cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    pose_res = pose.detect(mp_image)
    hand_res = hands.detect(mp_image)
    
    cid, conf = detect_distraction(pose_res, hand_res)
    update_stats(cid)
    baidu_result = baidu_analyse(img_b64)

    return jsonify({
        "class": cid,
        "label": LABELS[cid],
        "confidence": round(conf, 2),
        "baidu": baidu_result
    })

@app.route('/report', methods=['GET'])
def report():
    total = stats["focus_count"] + stats["phone_count"] + stats["look_count"] + stats["head_down_count"] + stats["talk_count"]
    focus_rate = 0
    if total > 0:
        focus_rate = round(stats["focus_count"] / total * 100, 1)

    return jsonify({
        "focus_rate": focus_rate,
        "focus_times": stats["focus_count"],
        "phone_times": stats["phone_count"],
        "look_times": stats["look_count"],
        "head_down_times": stats["head_down_count"],
        "talk_times": stats["talk_count"],
        "suggestion": get_suggestion()
    })

@app.route('/reset', methods=['GET'])
def reset():
    global stats
    stats = {
        "focus_count": 0,"phone_count": 0,"look_count": 0,"head_down_count": 0,"talk_count": 0,
        "last_class": 0,"start_time": time.time()
    }
    return jsonify({"status": "重置成功"})

@app.route('/')
def home():
    return "✅ 专注度检测服务已启动（兼容MediaPipe 0.10+）"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)