const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/login`,
  REGISTER: `${API_BASE_URL}/api/register`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/update-profile`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/change-password`,

  // Location
  LOCATION_ALL: `${API_BASE_URL}/api/location/all`,
  LOCATION_SEARCH: (q) => `${API_BASE_URL}/api/location/search?q=${encodeURIComponent(q)}`,
  LOCATION_ASSIGN_MULTIPLE: `${API_BASE_URL}/api/location/assign-multiple`,

  // Department
  DEPARTMENTS_ALL: `${API_BASE_URL}/api/department/all`,
  DEPARTMENTS_SEARCH: (q) => `${API_BASE_URL}/api/department/search?q=${encodeURIComponent(q)}`,
  DEPARTMENT_BY_ID: (id) => `${API_BASE_URL}/api/department/${id}`,
  DEPARTMENT_BY_CODE: (code) => `${API_BASE_URL}/api/department/code/${code}`,

  // Detection
  DETECT_CAMERA: `${API_BASE_URL}/api/detect/camera`,
  DETECT_CAMERA_SIMPLE: `${API_BASE_URL}/api/detect/camera/simple`,
  
  // Serial Detection
  SERIAL_DETECT_CAMERA: `${API_BASE_URL}/api/serial/detect/camera`,
  SERIAL_DETECT_COMPLETE: `${API_BASE_URL}/api/serial/detect/complete`,
  SERIAL_GET_SPECS: `${API_BASE_URL}/api/serial/specs`,
  
  
  // OCR
  OCR_EXTRACT_SERIAL: `${API_BASE_URL}/api/ocr/extract-serial`,
  OCR_VALIDATE_SERIAL: `${API_BASE_URL}/api/ocr/validate-serial`,
  OCR_PROCESS_MANUAL: `${API_BASE_URL}/api/ocr/process-manual`,

  HEALTH_CHECK: `${API_BASE_URL}/api/health`,

  // Scanning Preparation
  SCANNING_PREP_CREATE: `${API_BASE_URL}/api/scanning-preparation/create`,
  SCANNING_PREP_LIST: `${API_BASE_URL}/api/scanning-preparation/list`,
  SCANNING_PREP_DETAIL: (id) => `${API_BASE_URL}/api/scanning-preparation/${id}`,
  SCANNING_PREP_DELETE: (id) => `${API_BASE_URL}/api/scanning-preparation/${id}`,
};

export default API_BASE_URL;
