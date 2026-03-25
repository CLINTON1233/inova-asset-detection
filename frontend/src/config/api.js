const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const API_ENDPOINTS = {
  // DETECTION YOLO
  // Detection
  DETECT_CAMERA: `${API_BASE_URL}/api/detect/camera`,
  DETECT_CAMERA_SIMPLE: `${API_BASE_URL}/api/detect/camera/simple`,

  // Serial Detection
  SERIAL_DETECT_CAMERA: `${API_BASE_URL}/api/serial/detect/camera`,
  SERIAL_DETECT_COMPLETE: `${API_BASE_URL}/api/serial/detect/complete`,
  SERIAL_GET_SPECS: `${API_BASE_URL}/api/serial/specs`,

  // Material Detection
  MATERIAL_DETECT_CAMERA: `${API_BASE_URL}/api/detect/material/camera`,

  // OCR
  OCR_EXTRACT_SERIAL: `${API_BASE_URL}/api/ocr/extract-serial`,
  OCR_VALIDATE_SERIAL: `${API_BASE_URL}/api/ocr/validate-serial`,
  OCR_PROCESS_MANUAL: `${API_BASE_URL}/api/ocr/process-manual`,

  HEALTH_CHECK: `${API_BASE_URL}/api/health`,

  // SYSTEM
  // Auth
  LOGIN: `${API_BASE_URL}/api/login`,
  REGISTER: `${API_BASE_URL}/api/register`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/update-profile`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/change-password`,

  // Location
  LOCATION_ALL: `${API_BASE_URL}/api/location/all`,
  LOCATION_SEARCH: (q) =>
    `${API_BASE_URL}/api/location/search?q=${encodeURIComponent(q)}`,
  LOCATION_ASSIGN_MULTIPLE: `${API_BASE_URL}/api/location/assign-multiple`,

  // Department
  DEPARTMENTS_ALL: `${API_BASE_URL}/api/department/all`,
  DEPARTMENTS_SEARCH: (q) =>
    `${API_BASE_URL}/api/department/search?q=${encodeURIComponent(q)}`,
  DEPARTMENT_BY_ID: (id) => `${API_BASE_URL}/api/department/${id}`,
  DEPARTMENT_BY_CODE: (code) => `${API_BASE_URL}/api/department/code/${code}`,

  // Scanning Preparation (Devices)
  DEVICES_SCANNING_PREP_CREATE: `${API_BASE_URL}/api/devices/scanning-preparation/create`,
  DEVICES_SCANNING_PREP_LIST: `${API_BASE_URL}/api/devices/scanning-preparation/list`,
  DEVICES_SCANNING_PREP_DETAIL: (id) =>
    `${API_BASE_URL}/api/devices/scanning-preparation/${id}`,
  DEVICES_SCANNING_PREP_UPDATE: (id) =>
    `${API_BASE_URL}/api/devices/scanning-preparation/${id}`,
  DEVICES_SCANNING_PREP_DELETE: (id) =>
    `${API_BASE_URL}/api/devices/scanning-preparation/${id}`,
  DEVICES_SCANNING_PREP_PROGRESS: (id) =>
    `${API_BASE_URL}/api/devices/scanning-preparation/${id}/progress`,

  // Scanning Preparation (Materials)
  MATERIALS_SCANNING_PREP_CREATE: `${API_BASE_URL}/api/materials/scanning-preparation/create`,
  MATERIALS_SCANNING_PREP_LIST: `${API_BASE_URL}/api/materials/scanning-preparation/list`,
  MATERIALS_SCANNING_PREP_DETAIL: (id) =>
    `${API_BASE_URL}/api/materials/scanning-preparation/${id}`,
  MATERIALS_SCANNING_PREP_UPDATE: (id) =>
    `${API_BASE_URL}/api/materials/scanning-preparation/${id}`,
  MATERIALS_SCANNING_PREP_DELETE: (id) =>
    `${API_BASE_URL}/api/materials/scanning-preparation/${id}`,
  MATERIALS_SCANNING_PREP_PROGRESS: (id) =>
    `${API_BASE_URL}/api/materials/scanning-preparation/${id}/progress`,

  // UOM List
  UOM_LIST: `${API_BASE_URL}/api/materials/uom`,

  // All Scanning Preparations (Combined)
  SCANNING_PREP_LIST_ALL: `${API_BASE_URL}/api/scanning-preparation/list-all`,

  // Items Preparation Devices
  DEVICES_ITEMS_PREPARATION_AVAILABLE: (prepId, itemId) =>
    `${API_BASE_URL}/api/devices/items-preparation/${prepId}/item/${itemId}/available`,
  DEVICES_ITEMS_PREPARATION_UPDATE: (id) =>
    `${API_BASE_URL}/api/devices/items-preparation/${id}`,

  // Items Preparation Materials
  MATERIALS_ITEMS_PREPARATION_AVAILABLE: (prepId, itemId) =>
    `${API_BASE_URL}/api/materials/items-preparation/${prepId}/item/${itemId}/available`,
  MATERIALS_ITEMS_PREPARATION_UPDATE: (id) =>
    `${API_BASE_URL}/api/materials/items-preparation/${id}`,

  // Scan Results Device
  SCAN_RESULTS_CREATE_DEVICE: `${API_BASE_URL}/api/scan-results/create-device`,
  SCAN_RESULTS_UPDATE_DEVICE: (id) =>
    `${API_BASE_URL}/api/scan-results/device/${id}`,
  SCAN_RESULTS_DELETE_DEVICE: (id) =>
    `${API_BASE_URL}/api/scan-results/device/${id}`,

  // Scan Results Materials
  SCAN_RESULTS_CREATE_MATERIAL: `${API_BASE_URL}/api/scan-results/create-material`,
  SCAN_RESULTS_UPDATE_MATERIAL: (id) =>
    `${API_BASE_URL}/api/scan-results/material/${id}`,
  SCAN_RESULTS_DELETE_MATERIAL: (id) =>
    `${API_BASE_URL}/api/scan-results/material/${id}`,

  // Check Serial Number & Scan Code
  SCAN_RESULTS_CHECK_SERIAL: (serial) =>
    `${API_BASE_URL}/api/scan-results/check-serial?serial=${encodeURIComponent(serial)}`,
  SCAN_RESULTS_CHECK_SCAN_CODE: (code) => 
    `${API_BASE_URL}/api/scan-results/check-scan-code?code=${encodeURIComponent(code)}`,

  // Validations
  VALIDATIONS_CREATE: `${API_BASE_URL}/api/validations/create`,
  VALIDATIONS_UPDATE: (id) => `${API_BASE_URL}/api/validations/${id}`,
  VALIDATIONS_LIST: `${API_BASE_URL}/api/validations`,
  VALIDATIONS_DETAIL: (id) => `${API_BASE_URL}/api/validations/${id}/detail`,
  VALIDATIONS_BULK: `${API_BASE_URL}/api/validations/bulk`,
};

export default API_BASE_URL;
