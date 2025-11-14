from flask import Flask, request
from ultralytics import YOLO
import os
from urllib.parse import quote
import uuid
from datetime import datetime
from detect_brand import detect_brand_from_image

app = Flask(__name__)

# === CONFIG ===
MODEL_PATH = os.path.join("runs", "detect", "inventaris_yolo_v8", "weights", "best.pt")
model = YOLO(MODEL_PATH)

UPLOAD_FOLDER = 'uploads'
RESULT_FOLDER = 'static/results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULT_FOLDER'] = RESULT_FOLDER


# ======================================================================
# HALAMAN UTAMA
# ======================================================================
@app.route('/')
def index():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>YOLOv8 Object Detection</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .file-input-group { margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .file-input-row { display: flex; align-items: center; margin-bottom: 10px; }
            .file-input-row input[type="file"] { flex: 1; margin-right: 10px; }
            .btn { padding: 10px 15px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
            .btn-primary { background: #007bff; color: white; }
            .btn-success { background: #28a745; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            #fileInputsContainer { margin: 20px 0; }
            .file-info { font-size: 12px; color: #666; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2> Object Detection YOLOv8</h2>
            <p>Upload gambar untuk deteksi objek.</p>
            
            <form method="POST" action="/predict" enctype="multipart/form-data" id="uploadForm">
                <div id="fileInputsContainer">
                    <div class="file-input-group">
                        <div class="file-input-row">
                            <input type="file" name="files" multiple required class="file-input" onchange="showFileInfo(this)">
                            <button type="button" class="btn btn-danger" onclick="removeFileInput(this)">Hapus</button>
                        </div>
                        <div class="file-info">Pilih satu atau multiple gambar</div>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <button type="button" class="btn btn-success" onclick="addFileInput()">Tambah Gambar</button>
                    <button type="submit" class="btn btn-primary">Upload Image for Detection Yolov8n</button>
                    <button type="button" class="btn btn-secondary" onclick="clearAllFiles()">Hapus Semua</button>
                </div>
            </form>

        </div>

        <script>
            function addFileInput() {
                const container = document.getElementById('fileInputsContainer');
                
                const newFileGroup = document.createElement('div');
                newFileGroup.className = 'file-input-group';
                newFileGroup.innerHTML = `
                    <div class="file-input-row">
                        <input type="file" name="files" multiple required class="file-input" onchange="showFileInfo(this)">
                        <button type="button" class="btn btn-danger" onclick="removeFileInput(this)">🗑️ Hapus</button>
                    </div>
                    <div class="file-info">Pilih satu atau multiple gambar</div>
                `;
                
                container.appendChild(newFileGroup);
            }

            function showFileInfo(input) {
                const fileInfo = input.parentElement.nextElementSibling;
                if (input.files.length > 0) {
                    const fileNames = Array.from(input.files).map(file => file.name).join(', ');
                    fileInfo.textContent = `Dipilih: ${input.files.length} file - ${fileNames}`;
                    fileInfo.style.color = '#28a745';
                } else {
                    fileInfo.textContent = 'Pilih satu atau multiple gambar';
                    fileInfo.style.color = '#666';
                }
            }

            function removeFileInput(button) {
                const groups = document.querySelectorAll('.file-input-group');
                if (groups.length > 1) {
                    button.closest('.file-input-group').remove();
                } else {
                    alert('Minimal harus ada satu input file!');
                }
            }

            function clearAllFiles() {
                const inputs = document.querySelectorAll('.file-input');
                const infos = document.querySelectorAll('.file-info');
                
                inputs.forEach(i => i.value = '');
                infos.forEach(info => {
                    info.textContent = 'Pilih satu atau multiple gambar';
                    info.style.color = '#666';
                });
            }
        </script>

    </body>
    </html>
    '''


@app.route('/predict', methods=['POST'])
def predict():
    uploaded_files = request.files.getlist('files')

    if not uploaded_files:
        return "Tidak ada file yang diupload", 400

    detected_images_html = ""
    success_count = 0
    error_count = 0

    for file in uploaded_files:
        if file.filename == '':
            continue

        try:
            # Generate filename unik
            original_filename = file.filename
            file_extension = os.path.splitext(original_filename)[1]
            unique_id = str(uuid.uuid4())[:8]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_filename = f"{timestamp}_{unique_id}_{original_filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)

            # YOLO PREDICT
            results = model.predict(
                source=filepath,
                save=True,
                project=app.config['RESULT_FOLDER'],
                name='deteksi',
                exist_ok=True
            )


            # BRAND DETECTION
            detected_items = []

            # ambil image_path dari YOLO result
            image_path = results[0].path   

            for r in results:
                for box in r.boxes:
                    cls_name = model.names[int(box.cls[0])]
                    bbox = box.xyxy[0].tolist()

                    # detect brand ONLY on monitors
                    if cls_name.lower() == "monitor":
                        brand = detect_brand_from_image(image_path, bbox, cls_name)
                    else:
                        brand = "N/A"

                    detected_items.append({
                        "object": cls_name,
                        "brand": brand,
                        "confidence": float(box.conf[0]),
                        "bbox": bbox
                    })


            print("Detected items:", detected_items)

            # Find result image
            result_dir = os.path.join(app.config['RESULT_FOLDER'], 'deteksi')
            result_image_path = None

            if os.path.exists(result_dir):
                files = [os.path.join(result_dir, f) for f in os.listdir(result_dir)]
                if files:
                    result_image_path = max(files, key=os.path.getctime)

            if result_image_path:
                web_path = '/' + result_image_path.replace("\\", "/")
                detected_images_html += f'''
                <div style="margin-bottom:20px; padding:15px; border:1px solid #28a745; border-radius:6px;">
                    <p><b>{original_filename}</b></p>
                    <img src="{web_path}" width="500">
                </div>
                '''
                success_count += 1

        except Exception as e:
            detected_images_html += f"<p>Error: {str(e)}</p>"
            error_count += 1

    return f"<h2>Done</h2>{detected_images_html}"


# ======================================================================
# RUN APP
# ======================================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
