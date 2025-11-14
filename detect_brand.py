import easyocr
import cv2
import numpy as np

ocr = easyocr.Reader(["en"], gpu=False)

BRANDS = [
    "hp", "dell", "lenovo", "asus", "acer",
    "samsung", "lg", "philips", "viewsonic",
    "sony", "benq", "huawei", "msi"
]

# ==== FALLBACK: DETEKSI LOGO HP ====
def detect_hp_circle(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # deteksi lingkaran via Hough
    circles = cv2.HoughCircles(
        blur,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=30,
        param1=50,
        param2=22,
        minRadius=10,
        maxRadius=40
    )

    return circles is not None


# ==== OCR Preprocessing ====
def preprocess_for_ocr(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # tingkatkan kontras
    gray = cv2.equalizeHist(gray)
    # sharpen biar teks jelas
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    sharp = cv2.filter2D(gray, -1, kernel)
    # threshold ringan
    _, th = cv2.threshold(sharp, 150, 255, cv2.THRESH_BINARY)
    return th


# ==== FUNGSI UTAMA ====
def detect_brand_from_image(image_path, bbox, cls_name=""):
    x1, y1, x2, y2 = map(int, bbox)
    img = cv2.imread(image_path)

    crop = img[y1:y2, x1:x2]

    # ==== SPECIAL HANDLING UNTUK MONITOR ====
    if cls_name.lower() == "monitor":
        h, w = crop.shape[:2]

        # ambil 50% area bawah (bezelnya)
        crop = crop[int(h * 0.50):h, :]

        # tambahkan padding 20px agar logo tidak terpotong
        crop = cv2.copyMakeBorder(
            crop,
            10, 10, 20, 20,
            cv2.BORDER_CONSTANT,
            value=[0, 0, 0]
        )

    # ==== Preprocess sebelum OCR ====
    processed = preprocess_for_ocr(crop)

    # ==== OCR ====
    result = ocr.readtext(processed)

    text = " ".join([r[1] for r in result]).lower()
    text = text.replace(" ", "")

    # ==== cek brand berdasarkan teks ====
    for b in BRANDS:
        if b in text:
            return b.capitalize()

    # ==== fallback khusus HP (logo bulat) ====
    if detect_hp_circle(crop):
        return "HP"

    return "Unknown"
