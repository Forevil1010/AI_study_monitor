import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'

let detectorPromise = null
let activeDetector = null

/**
 * 加载 BlazeFace 检测器（浏览器端推理，无需走后端）
 */
export function loadFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      const opts = (delegate) => ({
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate,
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      })
      try {
        activeDetector = await FaceDetector.createFromOptions(fileset, opts('GPU'))
      } catch {
        activeDetector = await FaceDetector.createFromOptions(fileset, opts('CPU'))
      }
      return activeDetector
    })()
  }
  return detectorPromise
}

function boxMetrics(box, iw, ih) {
  let ox = box.originX ?? box.xMin ?? box.x ?? 0
  let oy = box.originY ?? box.yMin ?? box.y ?? 0
  let w = box.width ?? 0
  let h = box.height ?? 0
  // 部分版本返回 0~1 归一化坐标
  const looksNormalized =
    ox >= 0 &&
    oy >= 0 &&
    w > 0 &&
    h > 0 &&
    ox + w <= 1.001 &&
    oy + h <= 1.001
  if (looksNormalized) {
    ox *= iw
    oy *= ih
    w *= iw
    h *= ih
  }
  const cx = ox + w / 2
  const cy = oy + h / 2
  const ndx = (cx - iw / 2) / (iw / 2)
  const ndy = (cy - ih / 2) / (ih / 2)
  const centerOffset = Math.hypot(ndx, ndy)
  const areaRatio = (w * h) / (iw * ih)
  return { centerOffset, areaRatio }
}

/**
 * 根据单帧画面判断是否在专注（启发式：人脸存在、大致居中、大小合理）
 */
export function analyzeFocus(canvas, detector) {
  const iw = canvas.width
  const ih = canvas.height
  if (!iw || !ih) {
    return { isDistracted: true, reason: '画面无效' }
  }

  const result = detector.detect(canvas)
  const dets = result.detections ?? []

  if (dets.length === 0) {
    return { isDistracted: true, reason: '未检测到人脸，请面向摄像头' }
  }
  if (dets.length > 1) {
    return { isDistracted: true, reason: '检测到多人，请独自专注学习' }
  }

  const { centerOffset, areaRatio } = boxMetrics(dets[0].boundingBox, iw, ih)

  if (areaRatio < 0.032) {
    return { isDistracted: true, reason: '人脸过小，请靠近或正视屏幕' }
  }
  if (centerOffset > 0.48) {
    return { isDistracted: true, reason: '头部偏离中央，请正视学习' }
  }

  return { isDistracted: false, reason: '' }
}

export async function closeFaceDetector() {
  if (activeDetector?.close) {
    await activeDetector.close()
  }
  activeDetector = null
  detectorPromise = null
}
