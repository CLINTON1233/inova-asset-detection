from flask import Flask, request
from ultralytics import YOLO
import os
from urllib.parse import quote
import uuid
from datetime import datetime

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

# === HALAMAN UTAMA ===
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
            .btn { 
                padding: 10px 15px; 
                margin: 5px;
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 14px;
            }
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
            <p>Upload gambar untuk deteksi objek (Keyboard, Mouse, PC, dll)</p>
            
            <form method="POST" action="/predict" enctype="multipart/form-data" id="uploadForm">
                <div id="fileInputsContainer">
                    <div class="file-input-group">
                        <div class="file-input-row">
                            <input type="file" name="files" multiple required class="file-input" onchange="showFileInfo(this)">
                            <button type="button" class="btn btn-danger" onclick="removeFileInput(this)"> Hapus</button>
                        </div>
                        <div class="file-info">Pilih satu atau multiple gambar</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="button" class="btn btn-success" onclick="addFileInput()"> Tambah Gambar</button>
                    <button type="submit" class="btn btn-primary">Upload Image for Detection Yolov8n</button>
                    <button type="button" class="btn btn-secondary" onclick="clearAllFiles()"> Hapus Semua</button>
                </div>
            </form>
        </div>

        <script>
            let fileInputCounter = 1;

            function addFileInput() {
                fileInputCounter++;
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
                const fileGroups = document.querySelectorAll('.file-input-group');
                
                if (fileGroups.length > 1) {
                    const fileGroup = button.closest('.file-input-group');
                    fileGroup.remove();
                } else {
                    alert('Minimal harus ada satu input file!');
                }
            }

            function clearAllFiles() {
                const fileInputs = document.querySelectorAll('.file-input');
                const fileInfos = document.querySelectorAll('.file-info');
                
                fileInputs.forEach(input => {
                    input.value = '';
                });
                
                fileInfos.forEach(info => {
                    info.textContent = 'Pilih satu atau multiple gambar';
                    info.style.color = '#666';
                });
            }

            document.getElementById('uploadForm').addEventListener('submit', function(e) {
                const fileInputs = document.querySelectorAll('.file-input');
                let totalFiles = 0;
                
                fileInputs.forEach(input => {
                    totalFiles += input.files.length;
                });
                
                if (totalFiles === 0) {
                    e.preventDefault();
                    alert('Pilih minimal satu gambar!');
                    return false;
                }
                
                if (totalFiles > 20) {
                    e.preventDefault();
                    alert('Maksimal 20 gambar sekaligus!');
                    return false;
                }
            });
        </script>
    </body>
    </html>
    '''

# === PROSES MULTIPLE UPLOAD + DETEKSI ===
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
            # Generate unique filename untuk menghindari overwrite
            original_filename = file.filename
            file_extension = os.path.splitext(original_filename)[1]
            unique_id = str(uuid.uuid4())[:8]  # 8 karakter random
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_filename = f"{timestamp}_{unique_id}_{original_filename}"
            
            # Simpan file ke folder uploads dengan nama unik
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)

            print(f"Processing: {original_filename} -> {unique_filename}")

            # Jalankan YOLOv8 detection
            results = model.predict(
                source=filepath,
                save=True,
                project=app.config['RESULT_FOLDER'],
                name='deteksi',
                exist_ok=True
            )

            # Debug info
            print(f"YOLO save_dir: {results[0].save_dir}")
                    # Sebelumnya: kode gagal mencari possible_paths
            # Ganti dengan:
            result_dir = os.path.join(app.config['RESULT_FOLDER'], 'deteksi')
            result_image_path = None

            if os.path.exists(result_dir):
                files = [os.path.join(result_dir, f) for f in os.listdir(result_dir)]
                files = [f for f in files if os.path.isfile(f)]
                if files:
                    # ambil file terbaru berdasarkan waktu dibuat
                    result_image_path = max(files, key=os.path.getctime)
                    print(f"Detected image path: {result_image_path}")

            if result_image_path:
                web_path = '/' + result_image_path.replace('\\', '/')
                detected_images_html += f'''
                <div style="margin-bottom: 30px; padding: 15px; border: 2px solid #28a745; border-radius: 8px; background: #f8fff8;">
                    <p style="margin: 0 0 10px 0;"><b> {original_filename}</b></p>
                    <img src="{web_path}" width="500" style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px;" alt="Hasil deteksi">
                    <p style="margin: 5px 0; font-size: 12px; color: #666;">Path: {web_path}</p>
                </div>
                '''
                success_count += 1
            else:
                # Ganti bagian debug, jangan pakai possible_paths
                existing_files = os.listdir(result_dir) if os.path.exists(result_dir) else []
                detected_images_html += f'''
                <div style="margin-bottom: 30px; padding: 15px; border: 2px solid #dc3545; border-radius: 8px; background: #fff8f8;">
                    <p style="margin: 0 0 10px 0;"><b> {original_filename}</b> - File hasil tidak ditemukan</p>
                    <p style="margin: 5px 0; font-size: 12px;">Unique filename: {unique_filename}</p>
                    <p style="margin: 5px 0; font-size: 12px;">Save dir: {result_dir}</p>
                    <p style="margin: 5px 0; font-size: 12px;">Files in result dir: {', '.join(existing_files[:5])}</p>
                </div>
                '''
                error_count += 1

        except Exception as e:
            # Tangani error umum agar blok try selalu memiliki except/finally
            # Gunakan fallback untuk variabel yang mungkin belum terdefinisi
            orig_name = locals().get('original_filename', getattr(file, 'filename', ''))
            uniq_name = locals().get('unique_filename', 'N/A')
            result_dir = locals().get('result_dir', os.path.join(app.config['RESULT_FOLDER'], 'deteksi'))
            existing_files = os.listdir(result_dir) if os.path.exists(result_dir) else []

            print(f"Error processing {orig_name}: {e}")
            detected_images_html += f'''
            <div style="margin-bottom: 30px; padding: 15px; border: 2px solid #dc3545; border-radius: 8px; background: #fff8f8;">
                <p style="margin: 0 0 10px 0;"><b> {orig_name}</b> - Error saat memproses: {str(e)}</p>
                <p style="margin: 5px 0; font-size: 12px;">Unique filename: {uniq_name}</p>
                <p style="margin: 5px 0; font-size: 12px;">Save dir: {result_dir}</p>
                <p style="margin: 5px 0; font-size: 12px;">Files in result dir: {', '.join(existing_files[:5])}</p>
            </div>
            '''
            error_count += 1


    # Summary
    summary_html = f'''
    <div style="margin-bottom: 20px; padding: 15px; border-radius: 8px; background: {'#d4edda' if error_count == 0 else '#f8d7da'};">
        <h4 style="margin: 0;"> Summary:</h4>
        <p style="margin: 5px 0;"> Berhasil: {success_count} gambar</p>
        <p style="margin: 5px 0;"> Gagal: {error_count} gambar</p>
        <p style="margin: 5px 0;"> Total diproses: {len(uploaded_files)} gambar</p>
    </div>
    '''

    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hasil Deteksi</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .container {{ max-width: 900px; margin: 0 auto; }}
            .btn {{ 
                padding: 10px 15px; 
                background: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                display: inline-block;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h3> Hasil Deteksi Semua Gambar</h3>
            {summary_html}
            {detected_images_html}
            <a href="/" class="btn">Kembali ke Upload</a>
        </div>
    </body>
    </html>
    '''

if __name__ == '__main__':
    app.run(debug=True)