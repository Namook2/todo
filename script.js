'use strict';

/* ==========================================================================
   설정값 (Google Maps API 키 등)
   ========================================================================== */

// Google Maps API 키를 여기에 입력하세요. (Maps JavaScript API + Places API 활성화 필요)
const GOOGLE_MAPS_API_KEY = 'AIzaSyB2kEOJz4CjRUei3Y2W2szZEjlySG0OX8o';

// localStorage에 데이터를 저장할 때 쓰는 키 모음.
// 기본 메뉴(할 일/갈 곳/먹을 것)는 각각 고정된 키를 쓰고,
// 사용자가 추가한 커스텀 메뉴는 getAllMenus()에서 `todoapp_custom_${메뉴id}` 형태로 별도 키를 만들어 씁니다.
const STORAGE_KEYS = {
  menus: 'todoapp_customMenus',      // 사용자가 추가한 커스텀 메뉴 목록(이름/유형)
  todos: 'todoapp_todos',            // 기본 '할 일' 메뉴의 날짜별 항목
  places: 'todoapp_places',          // 기본 '갈 곳' 메뉴의 핀 목록
  foods: 'todoapp_foods',            // 기본 '먹을 것' 메뉴의 항목 목록
  lastActiveMenu: 'todoapp_lastActiveMenu', // (현재는 저장만 하고 읽어서 복원하는 곳은 없음)
  settings: 'todoapp_settings',      // 폰트/언어/테마 등 앱 설정
  userLocation: 'todoapp_userLocation' // 최초 접속 시 받아온 위치 권한 좌표 캐시
};

// 이미지형 메뉴에 사진을 저장할 때, localStorage 용량을 아끼기 위해
// 리사이즈 기준으로 쓰는 최대 가로/세로 길이(px)와 JPEG 압축 품질(0~1)
const IMAGE_MAX_DIMENSION = 800;
const IMAGE_JPEG_QUALITY = 0.72;

// 기본 메뉴(할 일/갈 곳/먹을 것)의 표시 이름은 언어에 따라 달라져야 하므로,
// 메뉴 id별로 I18N 딕셔너리에서 찾을 키 이름을 매핑해둡니다. (menuDisplayName()에서 사용)
const BUILTIN_NAME_KEYS = { todo: 'menuTodo', place: 'menuPlace', food: 'menuFood' };

// 앱이 기본으로 제공하는 3개 메뉴. 사용자가 추가하는 커스텀 메뉴와 합쳐서
// getAllMenus()가 하나의 메뉴 배열로 돌려줍니다.
// type: 'text'(할 일처럼 날짜별 텍스트) / 'location'(지도 핀) / 'image'(이름+사진)
const DEFAULT_MENUS = [
  { id: 'todo', name: '할 일', type: 'text', builtin: true, storageKey: STORAGE_KEYS.todos },
  { id: 'place', name: '갈 곳', type: 'location', builtin: true, storageKey: STORAGE_KEYS.places },
  { id: 'food', name: '먹을 것', type: 'image', builtin: true, storageKey: STORAGE_KEYS.foods }
];

// 사용자가 [+] 버튼으로 추가할 수 있는 커스텀 메뉴의 최대 개수
const MAX_CUSTOM_MENUS = 5;

// 설정 화면의 "글씨 크기" 옵션(sm/md/lg/xl)을 실제 px 값으로 변환하는 표.
// applyFontSettings()가 이 값을 <html>의 font-size로 적용하면, style.css의 모든
// rem 단위 크기가 비율대로 함께 커지고 작아집니다.
const FONT_SIZE_PX = { sm: 16, md: 18, lg: 20, xl: 22 };

// 설정 화면의 "글꼴 종류" 옵션을 실제 font-family 문자열로 변환하는 표.
const FONT_STACKS = {
  system: '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif',
  gothic: '"맑은 고딕","Malgun Gothic",sans-serif',
  serif: '"바탕","Batang","Nanum Myeongjo",serif',
  rounded: '"굴림","Gulim",sans-serif',
  mono: '"Consolas","D2Coding",monospace'
};

// 앱을 처음 열었을 때(또는 저장된 설정이 없을 때) 사용하는 기본 설정값.
// loadSettings()가 localStorage에 저장된 값과 이 기본값을 합쳐서 appSettings를 만듭니다.
const DEFAULT_SETTINGS = {
  language: 'ko',
  themeMode: 'light',
  customAccent: '#4a6cf7',
  fontSize: 'md',
  fontFamily: 'system',
  fontWeight: '400'
};

/* ==========================================================================
   다국어 텍스트
   ========================================================================== */

// 화면에 쓰이는 모든 문구를 언어별로 모아둔 딕셔너리.
// 값이 문자열이면 그대로 쓰고, 함수이면(예: addPlaceholder, progressLabel 등)
// 인자를 넣어 문장을 조립합니다. 실제로 문구를 꺼낼 때는 아래 t() 함수를 통해서만 사용합니다.
// 새 문구를 추가할 때는 ko/en 두 언어 모두에 같은 키로 넣어주세요.
const I18N = {
  ko: {
    gearTitle: '설정',
    logoTitle: '처음 화면으로',
    navAddTitle: '새 메뉴 추가',
    calToday: '오늘로 이동',
    homeTitle: '나만의 리스트',
    homeSubtitle: '오늘도 하나씩 기록하고 채워보세요.',
    homeTodayTodo: '오늘의 할 일',
    homeSavedPlaces: '기록한 장소',
    homeFoodList: '먹을 것 목록',
    menuTodo: '할 일',
    menuPlace: '갈 곳',
    menuFood: '먹을 것',
    addPlaceholder: name => `${name} 항목을 입력하세요`,
    btnAdd: '추가',
    textEmptyHint: '아직 등록된 항목이 없어요. 위에서 추가해보세요.',
    progressLabel: (done, total, percent) => `${done} / ${total} 완료 (${percent}%)`,
    mapSearchPlaceholder: '장소, 주소를 검색해서 지도를 이동해보세요',
    mapSearchBtnLabel: '검색',
    mapSearchNoResult: '검색 결과가 없어요',
    mapSearchApiError: '검색 기능을 사용할 수 없어요. Google Cloud 콘솔에서 Places API 설정을 확인해주세요.',
    pinListTitle: '기록한 핀 목록',
    pinEmptyHint: '지도를 눌러 가고 싶은 곳을 핀으로 기록해보세요.',
    mapNoKey: '지도를 표시하려면 Google Maps API 키가 필요합니다.<br>config.js 파일의 <code>GOOGLE_MAPS_API_KEY</code> 값을 입력해주세요. (config.example.js 참고)',
    mapLoadFail: '지도를 불러오지 못했습니다. API 키와 네트워크 상태를 확인해주세요.',
    pinModalNewTitle: '새로운 장소 기록',
    pinModalViewTitle: '장소 정보',
    pinNameLabel: '장소 이름',
    pinNamePlaceholder: '예: 다음에 가볼 카페',
    pinAddressLabel: '주소 / 좌표',
    pinAddressLoading: '위치 정보를 불러오는 중...',
    pinNoteLabel: '메모',
    pinNotePlaceholder: '가고 싶은 이유, 기억할 정보 등을 메모해보세요',
    btnSave: '저장',
    btnDelete: '삭제',
    nearbySaveAsPin: '핀으로 저장',
    foodNamePlaceholder: '이름을 입력하세요 (예: 마라탕)',
    foodEmptyHint: '먹어보고 싶은 것을 추가해보세요.',
    imgPickTitle: name => `"${name}" 이미지 선택`,
    imgPickFileBtn: '📷 내 기기에서 이미지 선택',
    orDivider: '또는',
    imgPickInstructions: '구글 이미지 검색에서 마음에 드는 이미지를 길게 눌러(또는 우클릭) "이미지 복사"를 선택한 뒤, 아래에 붙여넣어주세요.',
    imgSearchOpenBtn: '🔍 구글 이미지 검색 열기',
    imgPasteZoneLabel: '📋 여기를 누르고 Ctrl+V로 붙여넣기',
    imgPasteBtn: '📋 클립보드에서 붙여넣기',
    imgPasteNoImage: '클립보드에 이미지가 없어요. 이미지를 먼저 복사해주세요.',
    imgPasteFailed: '클립보드에 접근할 수 없어요. 브라우저 권한을 확인해주세요.',
    imgPreviewPlaceholder: '이미지를 선택하거나 붙여넣으면 미리보기가 표시됩니다',
    mapClickHint: '지도의 장소를 누르면 저장 메뉴가 나타납니다',
    btnSkip: '나중에 하기',
    foodNoImage: '저장된 이미지가 없어요',
    btnChangeImg: '이미지 변경',
    menuLimitTitle: '메뉴 추가 불가',
    menuLimitDesc: max => `메뉴는 최대 ${max}개까지 추가할 수 있어요.`,
    btnConfirm: '확인',
    addMenuTitle: '새 메뉴 추가',
    menuNameLabel: '메뉴 이름',
    menuNamePlaceholder: '예: 보고 싶은 것',
    menuTypeLabel: '메뉴 유형',
    typeTextTitle: '텍스트형',
    typeTextDesc: "'할 일'처럼 날짜별로 항목을 추가/완료/삭제",
    typeLocationTitle: '위치형',
    typeLocationDesc: "'갈 곳'처럼 지도에 핀을 꽂아 장소를 기록",
    typeImageTitle: '이미지형',
    typeImageDesc: "'먹을 것'처럼 이름과 이미지를 함께 기록",
    btnCancel: '취소',
    btnAddMenu: '추가하기',
    menuUsageNote: (cur, max) => `현재 ${cur} / ${max}개 사용 중`,
    menuChooseTitle: '메뉴',
    menuChooseAddTitle: '새 메뉴 추가',
    menuChooseAddDesc: '새로운 메뉴를 만들어요',
    menuChooseManageTitle: '메뉴 관리',
    menuChooseManageDesc: '메뉴 이름을 바꾸거나 삭제해요',
    manageMenuTitle: '메뉴 관리',
    manageMenuEmpty: '추가한 메뉴가 없어요. [+]로 새 메뉴를 추가해보세요.',
    manageMenuNote: '이름은 입력창에서 바로 수정돼요. ✕를 누르면 메뉴와 저장된 항목이 함께 삭제돼요.',
    storageFullTitle: '저장 공간 부족',
    storageFullMessage: '브라우저 로컬 스토리지 용량이 가득 찼습니다. 사진이나 텍스트를 삭제해 주세요.',
    settingsTitle: '설정',
    settingsFontSize: '글씨 크기',
    fontSizeSmall: '작게',
    fontSizeMedium: '보통',
    fontSizeLarge: '크게',
    fontSizeXLarge: '아주 크게',
    settingsFontFamily: '글꼴 종류',
    fontSystem: '기본',
    fontGothic: '고딕',
    fontSerif: '명조',
    fontRounded: '둥근 고딕',
    fontMono: '모노스페이스',
    settingsFontWeight: '글씨 굵기',
    weightLight: '얇게',
    weightNormal: '보통',
    weightBold: '굵게',
    weightXBold: '아주 굵게',
    settingsLanguage: '언어',
    langKo: '한국어',
    langEn: 'English',
    settingsTheme: '테마',
    themeLight: '라이트 모드',
    themeDark: '다크 모드',
    themeCustom: '컬러 설정',
    themeAccentLabel: '포인트 컬러',
    btnClose: '닫기'
  },
  en: {
    gearTitle: 'Settings',
    logoTitle: 'Go to home',
    navAddTitle: 'Add menu',
    calToday: 'Go to Today',
    homeTitle: 'My List',
    homeSubtitle: 'Add one thing at a time, every day.',
    homeTodayTodo: "Today's To-Do",
    homeSavedPlaces: 'Saved Places',
    homeFoodList: 'Food List',
    menuTodo: 'To-Do',
    menuPlace: 'Places',
    menuFood: 'Food',
    addPlaceholder: name => `Add a "${name}" item`,
    btnAdd: 'Add',
    textEmptyHint: 'No items yet. Add one above.',
    progressLabel: (done, total, percent) => `${done} / ${total} done (${percent}%)`,
    mapSearchPlaceholder: 'Search a place or address to move the map',
    mapSearchBtnLabel: 'Search',
    mapSearchNoResult: 'No results found',
    mapSearchApiError: "Search isn't available. Please check the Places API setup in Google Cloud Console.",
    pinListTitle: 'Saved Pins',
    pinEmptyHint: 'Tap the map to drop a pin for places you want to go.',
    mapNoKey: 'A Google Maps API key is required to show the map.<br>Please set <code>GOOGLE_MAPS_API_KEY</code> in config.js (see config.example.js).',
    mapLoadFail: 'Failed to load the map. Check your API key and network connection.',
    pinModalNewTitle: 'New Place',
    pinModalViewTitle: 'Place Info',
    pinNameLabel: 'Place Name',
    pinNamePlaceholder: 'e.g. A cafe to visit next',
    pinAddressLabel: 'Address / Coordinates',
    pinAddressLoading: 'Loading location info...',
    pinNoteLabel: 'Note',
    pinNotePlaceholder: 'Write down why you want to go, or anything to remember',
    btnSave: 'Save',
    btnDelete: 'Delete',
    nearbySaveAsPin: 'Save as Pin',
    foodNamePlaceholder: 'Enter a name (e.g. Ramen)',
    foodEmptyHint: 'Add something you want to try.',
    imgPickTitle: name => `Choose image for "${name}"`,
    imgPickFileBtn: '📷 Choose Image from Device',
    orDivider: 'or',
    imgPickInstructions: 'In Google Image Search, long-press (or right-click) an image you like and choose "Copy image", then paste it below.',
    imgSearchOpenBtn: '🔍 Open Google Image Search',
    imgPasteZoneLabel: '📋 Click here and press Ctrl+V to paste',
    imgPasteBtn: '📋 Paste from Clipboard',
    imgPasteNoImage: 'No image found in clipboard. Copy an image first.',
    imgPasteFailed: 'Could not access the clipboard. Please check browser permissions.',
    imgPreviewPlaceholder: 'Choose or paste an image to preview it here',
    mapClickHint: 'Tap a place on the map to see the save option',
    btnSkip: 'Skip for now',
    foodNoImage: 'No image saved yet',
    btnChangeImg: 'Change Image',
    menuLimitTitle: 'Cannot Add Menu',
    menuLimitDesc: max => `You can add up to ${max} menus.`,
    btnConfirm: 'OK',
    addMenuTitle: 'Add New Menu',
    menuNameLabel: 'Menu Name',
    menuNamePlaceholder: 'e.g. Things to Watch',
    menuTypeLabel: 'Menu Type',
    typeTextTitle: 'Text Type',
    typeTextDesc: "Like 'To-Do': add / complete / delete items by date",
    typeLocationTitle: 'Location Type',
    typeLocationDesc: "Like 'Places': drop pins on a map",
    typeImageTitle: 'Image Type',
    typeImageDesc: "Like 'Food': save a name together with an image",
    btnCancel: 'Cancel',
    btnAddMenu: 'Add',
    menuUsageNote: (cur, max) => `Using ${cur} / ${max}`,
    menuChooseTitle: 'Menu',
    menuChooseAddTitle: 'Add New Menu',
    menuChooseAddDesc: 'Create a new menu',
    menuChooseManageTitle: 'Manage Menus',
    menuChooseManageDesc: 'Rename or delete your menus',
    manageMenuTitle: 'Manage Menus',
    manageMenuEmpty: 'No menus added yet. Tap [+] to add one.',
    manageMenuNote: 'Edit the name directly in the field. Tapping ✕ deletes the menu along with its saved items.',
    storageFullTitle: 'Storage Full',
    storageFullMessage: "Your browser's local storage is full. Please delete some photos or text.",
    settingsTitle: 'Settings',
    settingsFontSize: 'Font Size',
    fontSizeSmall: 'Small',
    fontSizeMedium: 'Medium',
    fontSizeLarge: 'Large',
    fontSizeXLarge: 'Extra Large',
    settingsFontFamily: 'Font Family',
    fontSystem: 'Default',
    fontGothic: 'Gothic',
    fontSerif: 'Serif',
    fontRounded: 'Rounded',
    fontMono: 'Monospace',
    settingsFontWeight: 'Font Weight',
    weightLight: 'Light',
    weightNormal: 'Normal',
    weightBold: 'Bold',
    weightXBold: 'Extra Bold',
    settingsLanguage: 'Language',
    langKo: '한국어',
    langEn: 'English',
    settingsTheme: 'Theme',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    themeCustom: 'Custom Color',
    themeAccentLabel: 'Accent Color',
    btnClose: 'Close'
  }
};

// 문구를 꺼내는 헬퍼. key에 해당하는 문구를 현재 언어(appSettings.language)
// 딕셔너리에서 찾고, 없으면 한국어(fallback)로 대체합니다.
// entry가 함수면(예: btnAdd(name) 형태) args를 넣어 호출한 결과 문자열을 반환합니다.
function t(key, ...args) {
  const dict = I18N[appSettings.language] || I18N.ko;
  const entry = dict[key] !== undefined ? dict[key] : I18N.ko[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

/* ==========================================================================
   전역 상태
   ========================================================================== */

let appSettings = { ...DEFAULT_SETTINGS };
let activeMenuId = null;   // null = 홈 화면
let selectedDate = todayISO(); // 현재 화면에 표시 중인 날짜(YYYY-MM-DD). 상단 날짜/달력으로 변경됨
let calendarViewYear = 0;  // 달력 팝업이 현재 보여주고 있는 연도 (openCalendar/buildCalendar에서 관리)
let calendarViewMonth = 0; // 0-11
let mainCalYear = 0;  // '할 일' 화면에 항상 펼쳐져 있는 메인 달력이 보여주고 있는 연도 (renderMainCalendar에서 관리)
let mainCalMonth = 0; // 0-11
let liveClockIntervalId = null; // '할 일' 화면의 실시간 시계용 setInterval id. renderMain()이 다시 그릴 때마다 정리됨
let googleMapsLoadPromise = null; // Google Maps 스크립트를 중복 로드하지 않도록 캐시해두는 Promise (loadGoogleMaps 참고)
const mapInstances = {};   // menuId -> { map, markers:{}, nearbyMarkers:[] }
let userLocation = loadJSON(STORAGE_KEYS.userLocation, null); // { lat, lng } from the one-time geolocation request

/* ==========================================================================
   유틸리티
   ========================================================================== */

// 한 자리 숫자 앞에 '0'을 붙여 두 자리로 맞춤 (예: 3 -> "03"). 날짜 문자열 조립에 사용.
function pad(n) { return String(n).padStart(2, '0'); }

// 오늘 날짜를 "YYYY-MM-DD" 형식 문자열로 반환. 앱 전체에서 날짜를 이 문자열 형식(ISO)으로 다룸.
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// year/month(0-11)/day를 받아 "YYYY-MM-DD" 문자열로 조립. 달력 칸을 그릴 때 사용.
function isoOf(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// "YYYY-MM-DD" 문자열을 Date 객체로 변환.
function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ISO 날짜 문자열을 화면에 보여줄 사람이 읽기 좋은 날짜(예: "2026년 8월 13일 목")로 변환.
// 현재 언어 설정(appSettings.language)에 맞는 로케일을 사용함.
function formatDisplayDate(iso) {
  const d = parseISO(iso);
  const locale = appSettings.language === 'en' ? 'en-US' : 'ko-KR';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// 할 일/핀/음식/메뉴 등 새 항목에 붙이는 간단한 고유 id 생성기.
// 현재 시각(36진수) + 임의 문자열을 합쳐서 충돌 가능성을 낮춤. (서버 없는 로컬 앱이라 이 정도로 충분)
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 사용자가 입력한 텍스트를 innerHTML로 그릴 때 HTML/스크립트로 해석되지 않도록 이스케이프.
// XSS 방지를 위해 사용자 입력이 들어가는 모든 innerHTML 조립에 반드시 이 함수를 거쳐야 함.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// localStorage에서 JSON을 읽어와 파싱. 저장된 값이 없거나 파싱에 실패하면 fallback을 반환.
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// 값을 JSON 문자열로 바꿔 localStorage에 저장.
// 저장 공간이 가득 차면(QuotaExceededError 등) 예외를 던지는 대신 false를 반환해,
// 호출한 쪽에서 안내 모달을 띄우고 안전하게 처리할 수 있게 함.
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

// 16진수 색상(hex)을 percent만큼 밝게(양수) 또는 어둡게(음수) 섞은 새 색상을 반환.
// applyTheme()에서 포인트 색(primary)을 기준으로 hover용 진한 색(primary-dark)을 자동 계산할 때 사용.
function shadeColor(hex, percent) {
  const clean = (hex || '#4a6cf7').replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.round(r + (percent < 0 ? r : 255 - r) * percent);
  g = Math.round(g + (percent < 0 ? g : 255 - g) * percent);
  b = Math.round(b + (percent < 0 ? b : 255 - b) * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ==========================================================================
   위치 권한 (페이지 접속 시 한 번만 요청)
   ========================================================================== */

// init()에서 한 번 호출되어 브라우저 위치 권한을 요청합니다.
// 사용자가 허용하면 좌표를 userLocation에 저장(+localStorage 캐시)하고, 이미 열려있는
// 모든 지도(mapInstances)를 그 위치로 이동시켜 다음에 지도를 열 때도 바로 내 위치 근처가 보이게 함.
function requestUserLocationOnce() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      saveJSON(STORAGE_KEYS.userLocation, userLocation);
      Object.values(mapInstances).forEach(inst => {
        inst.map.setCenter(userLocation);
        inst.map.setZoom(15);
      });
    },
    () => { /* 거부/실패 시 조용히 무시하고 기존 캐시/기본 위치 사용 */ },
    { enableHighAccuracy: true }
  );
}

/* ==========================================================================
   이미지 리사이즈 (저장 용량 절감)
   ========================================================================== */

// 이미지 Blob(파일 선택 또는 클립보드에서 받은 원본)을 받아,
// IMAGE_MAX_DIMENSION을 넘지 않도록 비율을 유지해 축소한 뒤 JPEG(base64 dataURL)로 반환.
// localStorage는 용량 제한(보통 5~10MB)이 있으므로, 원본 이미지를 그대로 저장하지 않고
// 캔버스에 그려 리사이즈/압축한 후 저장해 절약합니다.
function resizeImageBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const maxDim = IMAGE_MAX_DIMENSION;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('IMAGE_LOAD_FAIL')); };
    img.src = objectUrl;
  });
}

/* ==========================================================================
   설정 (폰트 / 언어 / 테마)
   ========================================================================== */

// localStorage에 저장된 설정을 읽어와 DEFAULT_SETTINGS와 합쳐 appSettings를 채움.
// (저장된 값이 일부만 있어도 나머지는 기본값으로 채워지도록 스프레드로 병합)
function loadSettings() {
  appSettings = { ...DEFAULT_SETTINGS, ...loadJSON(STORAGE_KEYS.settings, {}) };
}

// 현재 appSettings를 그대로 localStorage에 저장.
function saveSettings() {
  saveJSON(STORAGE_KEYS.settings, appSettings);
}

// 글씨 크기/글꼴/굵기 설정을 실제 CSS에 반영.
// html의 font-size를 바꾸면 style.css의 모든 rem 단위가 함께 스케일되고,
// --user-font-family/--user-font-weight CSS 변수를 바꾸면 body 전체 글꼴이 바로 바뀜.
function applyFontSettings() {
  document.documentElement.style.fontSize = (FONT_SIZE_PX[appSettings.fontSize] || FONT_SIZE_PX.md) + 'px';
  document.documentElement.style.setProperty('--user-font-family', FONT_STACKS[appSettings.fontFamily] || FONT_STACKS.system);
  document.documentElement.style.setProperty('--user-font-weight', appSettings.fontWeight);
}

// 현재 테마 모드(light/dark/custom)에 맞는 색상 팔레트를 골라
// style.css가 참조하는 --color-* CSS 변수들에 실시간으로 반영.
// custom 모드에서는 사용자가 고른 포인트 색(customAccent)을 primary로 쓰고,
// hover용 진한 색(primary-dark)은 shadeColor()로 자동 계산.
function applyTheme() {
  let palette;
  if (appSettings.themeMode === 'dark') {
    palette = { pageBg: '#111214', bg: '#1b1c20', surface: '#242529', border: '#34353b', text: '#f2f2f4', textSub: '#a2a5ad', done: '#55575f', primary: '#6d8bff' };
  } else if (appSettings.themeMode === 'custom') {
    palette = { pageBg: '#e9eaee', bg: '#f4f5f7', surface: '#ffffff', border: '#e3e5e9', text: '#202124', textSub: '#767a82', done: '#b7bcc4', primary: appSettings.customAccent || '#4a6cf7' };
  } else {
    palette = { pageBg: '#e9eaee', bg: '#f4f5f7', surface: '#ffffff', border: '#e3e5e9', text: '#202124', textSub: '#767a82', done: '#b7bcc4', primary: '#4a6cf7' };
  }
  const root = document.documentElement.style;
  root.setProperty('--page-bg', palette.pageBg);
  root.setProperty('--color-bg', palette.bg);
  root.setProperty('--color-surface', palette.surface);
  root.setProperty('--color-border', palette.border);
  root.setProperty('--color-text', palette.text);
  root.setProperty('--color-text-sub', palette.textSub);
  root.setProperty('--color-done', palette.done);
  root.setProperty('--color-primary', palette.primary);
  root.setProperty('--color-primary-dark', shadeColor(palette.primary, -0.15));

  // 상단 헤더 로고 이미지(#logoBtn > img.logo-img) 교체:
  // 다크 모드일 때는 Logo2.png(다크 배경용 로고), 그 외(라이트/커스텀)에는 Logo1.png를 사용.
  const logoImg = document.querySelector('#logoBtn .logo-img');
  if (logoImg) {
    logoImg.src = appSettings.themeMode === 'dark' ? 'Logo2.png' : 'Logo1.png';
  }
}

// HTML에 고정으로 박혀 있는(동적으로 새로 그려지지 않는) 버튼들의 title/aria-label,
// 그리고 <html lang="">을 현재 언어 설정에 맞춰 갱신. 언어를 바꿀 때 applyLanguage()에서 호출됨.
function updateStaticLabels() {
  document.getElementById('logoBtn').title = t('logoTitle');
  document.getElementById('settingsBtn').title = t('gearTitle');
  document.getElementById('settingsBtn').setAttribute('aria-label', t('gearTitle'));
  document.getElementById('calTodayBtn').textContent = t('calToday');
  document.documentElement.lang = appSettings.language === 'en' ? 'en' : 'ko';
}

// 달력 팝업의 요일 헤더(일~토 / Sun~Sat)를 현재 언어에 맞춰 다시 그림.
function renderWeekdayHeaders() {
  const weekdays = appSettings.language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('calendarWeekdays').innerHTML = weekdays.map(d => `<span>${d}</span>`).join('');
}

// 설정에서 언어를 바꿨을 때, 화면에 보이는 모든 문구/화면을 새 언어로 다시 그리기 위해
// 관련된 렌더링 함수들을 한 번에 호출하는 진입점.
function applyLanguage() {
  updateStaticLabels();
  renderWeekdayHeaders();
  renderHeaderDate();
  if (calendarViewYear) buildCalendar();
  renderNav();
  renderMain();
}

/* ==========================================================================
   메뉴 관리
   ========================================================================== */

// 사용자가 [+]로 추가한 커스텀 메뉴 목록(이름/유형)을 불러옴.
function loadCustomMenus() {
  return loadJSON(STORAGE_KEYS.menus, []);
}

// 커스텀 메뉴 목록을 저장.
function saveCustomMenus(menus) {
  saveJSON(STORAGE_KEYS.menus, menus);
}

// 기본 메뉴 3개 + 커스텀 메뉴를 합친 전체 메뉴 배열을 반환.
// 커스텀 메뉴는 각자 고유한 storageKey(`todoapp_custom_${id}`)를 여기서 부여받음.
function getAllMenus() {
  const custom = loadCustomMenus().map(m => ({ ...m, storageKey: `todoapp_custom_${m.id}` }));
  return [...DEFAULT_MENUS, ...custom];
}

// menuId로 메뉴 정보(기본+커스텀 통틀어)를 찾음. 없으면 null.
function findMenu(menuId) {
  return getAllMenus().find(m => m.id === menuId) || null;
}

// 메뉴의 화면 표시용 이름. 기본 메뉴는 다국어 문구(t())를 쓰고,
// 커스텀 메뉴는 사용자가 직접 지은 이름(menu.name)을 그대로 씀.
function menuDisplayName(menu) {
  return menu.builtin ? t(BUILTIN_NAME_KEYS[menu.id]) : menu.name;
}

// 하단 네비게이션에서 다른 메뉴를 선택했을 때 호출. 현재 메뉴를 바꾸고
// 마지막 선택 메뉴를 저장한 뒤, 네비/메인 화면을 새로 그림.
function setActiveMenu(menuId) {
  activeMenuId = menuId;
  saveJSON(STORAGE_KEYS.lastActiveMenu, menuId);
  renderNav();
  renderMain();
}

/* ==========================================================================
   네비게이션 렌더링
   ========================================================================== */

// 하단 네비게이션 바를 처음부터 다시 그림 (기본 메뉴 + 커스텀 메뉴 + 맨 끝 [+] 버튼).
// 메뉴 구성이나 활성 메뉴가 바뀔 때마다(setActiveMenu, applyLanguage 등) 매번 새로 호출됨.
function renderNav() {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = '';

  getAllMenus().forEach(menu => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn' + (activeMenuId === menu.id ? ' active' : '');
    btn.textContent = menuDisplayName(menu);
    btn.addEventListener('click', () => setActiveMenu(menu.id));
    nav.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'nav-btn nav-add';
  addBtn.textContent = '+';
  addBtn.title = t('navAddTitle');
  addBtn.addEventListener('click', openMenuChoiceModal);
  nav.appendChild(addBtn);
}

/* ==========================================================================
   메인 화면 라우팅
   ========================================================================== */

// #appMain 영역을 현재 상태(activeMenuId)에 맞춰 처음부터 다시 그림.
// activeMenuId가 없으면 홈 화면, 있으면 메뉴의 type(text/location/image)에 맞는
// 렌더 함수로 분기함. 데이터가 바뀔 때마다(항목 추가/완료/삭제 등) 이 함수를 다시 호출해
// 화면 전체를 새로 그리는 방식(가상 DOM 없이 직접 리렌더)을 사용합니다.
function renderMain() {
  const main = document.getElementById('appMain');
  main.innerHTML = '';

  // 화면을 통째로 다시 그리기 전에, 이전 화면에서 돌고 있던 실시간 시계 타이머를 정리
  // (안 그러면 화면이 바뀐 뒤에도 더 이상 존재하지 않는 DOM을 계속 찾으려 하며 타이머가 누적됨)
  if (liveClockIntervalId) { clearInterval(liveClockIntervalId); liveClockIntervalId = null; }

  if (!activeMenuId) {
    setDateDisplayVisible(false);
    renderHomeView(main);
    return;
  }

  const menu = findMenu(activeMenuId);
  if (!menu) {
    activeMenuId = null;
    setDateDisplayVisible(false);
    renderHomeView(main);
    return;
  }

  // 날짜(달력) 선택창은 날짜별로 항목을 관리하는 'text' 타입 메뉴 중, 기본 '할 일' 메뉴를
  // 제외한 나머지(사용자 추가 텍스트 메뉴)에서만 보여줌. '할 일' 화면은 메인 화면 안에
  // 자체 달력(renderMainCalendar)이 항상 펼쳐져 있으므로 상단 오른쪽 날짜 선택은 숨김.
  // 홈 화면 / '갈 곳'(location) / '먹을 것'(image)은 날짜 개념이 없는 화면이라 숨김.
  setDateDisplayVisible(menu.type === 'text' && menu.id !== 'todo');

  if (menu.type === 'text') renderTextView(main, menu);
  else if (menu.type === 'location') renderLocationView(main, menu);
  else if (menu.type === 'image') renderImageView(main, menu);
}

// 상단 헤더의 날짜 버튼/달력 팝업 전체를 보이거나 숨김.
// 숨길 때는 열려 있던 달력 팝업도 같이 닫아, 나중에 다시 보일 때 이전 상태가 남아있지 않게 함.
function setDateDisplayVisible(visible) {
  document.getElementById('dateDisplay').hidden = !visible;
  if (!visible) document.getElementById('calendarPopup').hidden = true;
}

/* ==========================================================================
   홈 화면
   ========================================================================== */

// 로고를 눌렀을 때 보이는 첫 화면. 오늘의 할 일 완료 개수, 저장된 장소 수,
// 먹을 것 목록 수를 요약 카드로 보여주고, 카드를 누르면 해당 메뉴로 바로 이동.
function renderHomeView(main) {
  const todos = loadJSON(STORAGE_KEYS.todos, {});
  const todayList = todos[selectedDate] || [];
  const todoDone = todayList.filter(it => it.done).length;

  const places = loadJSON(STORAGE_KEYS.places, []);
  const foods = loadJSON(STORAGE_KEYS.foods, []);

  const hero = document.createElement('div');
  hero.className = 'home-hero';
  hero.innerHTML = `
    <h1>${escapeHtml(t('homeTitle'))}</h1>
    <p>${escapeHtml(t('homeSubtitle'))}<br>${escapeHtml(formatDisplayDate(selectedDate))}</p>
  `;
  main.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'home-summary-grid';
  grid.innerHTML = `
    <button class="home-summary-item" data-target="todo">
      <div class="home-summary-num">${todoDone}/${todayList.length}</div>
      <div class="home-summary-label">${escapeHtml(t('homeTodayTodo'))}</div>
    </button>
    <button class="home-summary-item" data-target="place">
      <div class="home-summary-num">${places.length}</div>
      <div class="home-summary-label">${escapeHtml(t('homeSavedPlaces'))}</div>
    </button>
    <button class="home-summary-item" data-target="food">
      <div class="home-summary-num">${foods.length}</div>
      <div class="home-summary-label">${escapeHtml(t('homeFoodList'))}</div>
    </button>
  `;
  grid.querySelectorAll('.home-summary-item').forEach(btn => {
    btn.addEventListener('click', () => setActiveMenu(btn.dataset.target));
  });
  main.appendChild(grid);
}

/* ==========================================================================
   텍스트형 (할 일 / 커스텀 텍스트 메뉴) - 날짜별 저장
   ========================================================================== */

// 텍스트형 메뉴의 저장 데이터를 불러옴. 구조: { "YYYY-MM-DD": [ {id, text, done}, ... ] }
function loadTextData(menu) {
  return loadJSON(menu.storageKey, {});
}
function saveTextData(menu, data) {
  return saveJSON(menu.storageKey, data);
}

// 텍스트형 메뉴 화면 전체(제목, 입력창, 진행률 바, 항목 목록)를 그리고
// 추가/완료토글/삭제 이벤트를 연결. selectedDate가 바뀔 때마다 renderMain()을 통해 다시 호출됨.
function renderTextView(main, menu) {
  const name = menuDisplayName(menu);
  const data = loadTextData(menu);
  const items = data[selectedDate] || [];
  const doneCount = items.filter(i => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  // 기본 '할 일' 메뉴에서만: 날짜 텍스트/시계보다 먼저 실제 달력을 그려서
  // 연/월/일 단위로 날짜를 넘겨보고, 그 날짜를 눌러 바로 할 일을 관리할 수 있게 함.
  if (menu.id === 'todo') {
    renderMainCalendar(main, menu);
  }

  const title = document.createElement('div');
  title.className = 'view-title';
  if (menu.id === 'todo') {
    // '할 일' 화면은 달력 바로 아래 제목을 "할 일" / 날짜 두 줄로 나눠서 표시.
    // 메뉴 이름("할 일") 쪽은 view-title-name 클래스로 더 크고 굵게 강조함.
    title.innerHTML = `<span class="view-title-name">${escapeHtml(name)}</span><br><span class="view-title-date">${escapeHtml('· ' + formatDisplayDate(selectedDate))}</span>`;
  } else {
    title.textContent = `${name} · ${formatDisplayDate(selectedDate)}`;
  }
  main.appendChild(title);

  // 기본 '할 일' 메뉴에서만: 날짜 텍스트 아래에 실시간으로 갱신되는 시계를 표시.
  if (menu.id === 'todo') {
    title.classList.add('has-clock');
    const clock = document.createElement('div');
    clock.className = 'view-clock';
    clock.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <polyline points="12 7 12 12 15.5 14"></polyline>
      </svg>
      <span id="liveClockText"></span>
    `;
    main.appendChild(clock);

    const locale = appSettings.language === 'en' ? 'en-US' : 'ko-KR';
    const clockText = document.getElementById('liveClockText');
    const tick = () => {
      clockText.textContent = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };
    tick();
    liveClockIntervalId = setInterval(tick, 1000);
  }

  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  addRow.innerHTML = `
    <input type="text" id="textInput" placeholder="${escapeHtml(t('addPlaceholder', name))}" maxlength="80">
    <button type="button" class="btn" id="textAddBtn">${escapeHtml(t('btnAdd'))}</button>
  `;
  main.appendChild(addRow);

  // 항목이 1개 이상 있을 때만 완료율 진행 바를 표시
  if (items.length) {
    const track = document.createElement('div');
    track.className = 'progress-bar-track';
    track.innerHTML = `<div class="progress-bar-fill" style="width:${percent}%"></div>`;
    main.appendChild(track);
    const label = document.createElement('div');
    label.className = 'progress-label';
    label.textContent = t('progressLabel', doneCount, items.length, percent);
    main.appendChild(label);
  }

  const list = document.createElement('ul');
  list.className = 'item-list';

  if (!items.length) {
    main.appendChild(makeEmptyHint(t('textEmptyHint')));
  } else {
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.innerHTML = `
        <button type="button" class="todo-check ${item.done ? 'done' : ''}" data-id="${item.id}">${item.done ? '✓' : ''}</button>
        <span class="todo-text ${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span>
        <button type="button" class="icon-btn" data-del="${item.id}" title="${escapeHtml(t('btnDelete'))}">✕</button>
      `;
      list.appendChild(li);
    });
  }
  main.appendChild(list);

  const input = document.getElementById('textInput');
  const addBtn = document.getElementById('textAddBtn');

  // 새 항목 추가: 현재 selectedDate 키 아래에 push 후 저장하고, 화면 전체를 다시 그림
  const doAdd = () => {
    const val = input.value.trim();
    if (!val) return;
    const d = loadTextData(menu);
    if (!d[selectedDate]) d[selectedDate] = [];
    d[selectedDate].push({ id: uid(), text: val, done: false });
    if (!saveTextData(menu, d)) { showStorageFullModal(); return; }
    renderMain();
  };
  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

  // 완료 체크 토글
  list.querySelectorAll('.todo-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = loadTextData(menu);
      const arr = d[selectedDate] || [];
      const target = arr.find(i => i.id === btn.dataset.id);
      if (target) target.done = !target.done;
      saveTextData(menu, d);
      renderMain();
    });
  });

  // 항목 삭제
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = loadTextData(menu);
      d[selectedDate] = (d[selectedDate] || []).filter(i => i.id !== btn.dataset.del);
      saveTextData(menu, d);
      renderMain();
    });
  });
}

// "아직 등록된 항목이 없어요" 같은 빈 상태 안내 문구 엘리먼트를 만들어 반환.
// 텍스트/위치/이미지형 화면에서 공통으로 사용.
function makeEmptyHint(text) {
  const div = document.createElement('div');
  div.className = 'empty-hint';
  div.textContent = text;
  return div;
}

/* ==========================================================================
   메인 화면 내장 달력 ('할 일' 화면 전용)
   상단 헤더의 날짜 선택 팝업 대신, '할 일' 화면 맨 위에 항상 펼쳐서 보여주는 실제 달력.
   ========================================================================== */

// 지정한 텍스트형 메뉴(여기서는 '할 일')의 저장 데이터에서 날짜별 항목 개수를 Map으로 모아 반환.
// renderMainCalendar()가 각 날짜 칸에 표시할 점(dot) 개수를 정하는 데 사용.
function collectItemCounts(menu) {
  const data = loadTextData(menu);
  const counts = new Map();
  Object.keys(data).forEach(dateKey => {
    const list = data[dateKey];
    if (list && list.length) counts.set(dateKey, list.length);
  });
  return counts;
}

// '할 일' 화면 맨 위에 실제로 조작 가능한 달력을 그림.
// 이전달/다음달 버튼으로 연/월을 이동하고(연도는 12월↔1월 경계를 넘을 때 자동으로 함께 바뀜),
// 날짜 칸을 누르면 selectedDate가 그 날짜로 바뀌면서 화면 전체가 다시 그려져
// 아래쪽 목록에 그 날짜의 할 일이 표시됨. 각 칸에는 그 날짜에 저장된 항목 개수만큼
// 작은 점을 찍어 어떤 날짜에 기록이 있는지 한눈에 보여주고, 칸에 다 못 담을 만큼 많으면
// 줄임표(…)로 대신 표시함.
function renderMainCalendar(main, menu) {
  // 처음 이 화면에 들어올 때는 현재 선택된 날짜(selectedDate)가 속한 연/월로 시작
  if (!mainCalYear) {
    const base = parseISO(selectedDate);
    mainCalYear = base.getFullYear();
    mainCalMonth = base.getMonth();
  }

  // 달력 전체를 감싸는 카드(월 이동 버튼 + 요일 헤더 + 날짜 그리드 + 오늘로 이동 버튼)
  const wrap = document.createElement('div');
  wrap.className = 'main-calendar';
  wrap.innerHTML = `
    <div class="main-calendar-head">
      <button type="button" class="cal-nav-btn" id="mainCalPrev">‹</button>
      <span id="mainCalMonthLabel"></span>
      <button type="button" class="cal-nav-btn" id="mainCalNext">›</button>
    </div>
    <div class="calendar-weekdays" id="mainCalWeekdays"></div>
    <div class="main-calendar-grid" id="mainCalGrid"></div>
    <button type="button" class="cal-today-btn" id="mainCalTodayBtn">${escapeHtml(t('calToday'))}</button>
  `;
  main.appendChild(wrap);

  // 요일 헤더(일~토 / Sun~Sat)를 현재 언어 설정에 맞춰 채움 (상단 헤더 달력과 같은 방식)
  const weekdays = appSettings.language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('mainCalWeekdays').innerHTML = weekdays.map(d => `<span>${d}</span>`).join('');

  // 달력의 월 라벨 + 날짜 그리드만 새로 그리는 내부 함수.
  // 이전달/다음달 버튼을 누를 때마다 화면 전체(renderMain)를 다시 그리지 않고 이 부분만
  // 갱신해서, 같이 떠 있는 실시간 시계 등 다른 요소가 깜빡이거나 끊기지 않게 함.
  function renderGrid() {
    const label = document.getElementById('mainCalMonthLabel');
    const locale = appSettings.language === 'en' ? 'en-US' : 'ko-KR';
    label.textContent = new Date(mainCalYear, mainCalMonth, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' });

    const grid = document.getElementById('mainCalGrid');
    grid.innerHTML = '';

    const firstDay = new Date(mainCalYear, mainCalMonth, 1).getDay();
    const lastDate = new Date(mainCalYear, mainCalMonth + 1, 0).getDate();
    const today = todayISO();
    const counts = collectItemCounts(menu);
    const maxDots = 4; // 한 칸에 표시할 점의 최대 개수 (이보다 항목이 많으면 줄임표로 표시)

    // 1일이 시작되는 요일 앞까지는 빈 칸으로 채워 요일 정렬을 맞춤
    for (let i = 0; i < firstDay; i++) {
      const span = document.createElement('span');
      span.className = 'main-cal-day is-empty';
      grid.appendChild(span);
    }

    for (let day = 1; day <= lastDate; day++) {
      const iso = isoOf(mainCalYear, mainCalMonth, day);
      const count = counts.get(iso) || 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'main-cal-day';
      if (iso === today) btn.classList.add('is-today');
      if (iso === selectedDate) btn.classList.add('is-selected');

      // 항목 개수만큼 점을 표시하되, maxDots를 넘으면 마지막 자리를 줄임표(…)로 대체
      let dotsHtml = '';
      if (count > 0) {
        const dotCount = count > maxDots ? maxDots - 1 : count;
        dotsHtml = '<span class="main-cal-dots">'
          + '<span class="main-cal-dot"></span>'.repeat(dotCount)
          + (count > maxDots ? '<span class="main-cal-dot-more">…</span>' : '')
          + '</span>';
      }
      btn.innerHTML = `<span class="main-cal-day-num">${day}</span>${dotsHtml}`;

      // 날짜 칸 클릭: 그 날짜를 선택 날짜로 바꾸고 화면 전체를 다시 그려
      // 아래쪽 목록에 그 날짜의 할 일이 뜨도록 함
      btn.addEventListener('click', () => {
        selectedDate = iso;
        renderMain();
      });
      grid.appendChild(btn);
    }
  }
  renderGrid();

  document.getElementById('mainCalPrev').addEventListener('click', () => {
    mainCalMonth--;
    if (mainCalMonth < 0) { mainCalMonth = 11; mainCalYear--; }
    renderGrid();
  });
  document.getElementById('mainCalNext').addEventListener('click', () => {
    mainCalMonth++;
    if (mainCalMonth > 11) { mainCalMonth = 0; mainCalYear++; }
    renderGrid();
  });
  // '오늘로 이동' 버튼: 선택 날짜와 달력이 보여주는 연/월을 모두 오늘 기준으로 되돌림
  document.getElementById('mainCalTodayBtn').addEventListener('click', () => {
    selectedDate = todayISO();
    const base = parseISO(selectedDate);
    mainCalYear = base.getFullYear();
    mainCalMonth = base.getMonth();
    renderMain();
  });
}

/* ==========================================================================
   위치형 (갈 곳 / 커스텀 위치 메뉴) - Google Maps
   ========================================================================== */

// 위치형 메뉴의 저장 데이터를 불러옴. 구조: [ {id, lat, lng, name, address, note, createdAt}, ... ]
function loadLocationData(menu) {
  return loadJSON(menu.storageKey, []);
}
function saveLocationData(menu, data) {
  return saveJSON(menu.storageKey, data);
}

// Google Maps JS SDK를 <script> 태그로 동적 로드. 이미 로드됐거나 로드 중이면
// 같은 Promise(googleMapsLoadPromise)를 재사용해 중복으로 스크립트를 추가하지 않음.
// API 키가 비어있으면 'NO_KEY', 로드 자체가 실패하면 'LOAD_FAIL' 에러로 reject됨
// (renderLocationView의 .catch()에서 안내 문구로 처리).
function loadGoogleMaps() {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) { resolve(window.google); return; }
    if (!GOOGLE_MAPS_API_KEY) { reject(new Error('NO_KEY')); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('LOAD_FAIL'));
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
}

// 위치형 메뉴 화면(검색창, 지도, 저장된 핀 목록)을 그림.
// 지도 자체는 Google Maps 스크립트 로드가 끝난 뒤 initMap()에서 비동기로 그려짐.
function renderLocationView(main, menu) {
  const title = document.createElement('div');
  title.className = 'view-title';
  title.textContent = menuDisplayName(menu);
  main.appendChild(title);

  const toolbar = document.createElement('div');
  toolbar.className = 'map-toolbar';
  toolbar.innerHTML = `
    <input type="text" id="placeSearchInput" placeholder="${escapeHtml(t('mapSearchPlaceholder'))}">
    <button type="button" id="placeSearchBtn" class="map-search-btn" title="${escapeHtml(t('mapSearchBtnLabel'))}" aria-label="${escapeHtml(t('mapSearchBtnLabel'))}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
    <div class="search-suggestions" id="searchSuggestions" hidden></div>
  `;
  main.appendChild(toolbar);

  const mapBox = document.createElement('div');
  mapBox.className = 'map-container';
  const mapDivId = `map_${menu.id}`;
  mapBox.innerHTML = `<div id="${mapDivId}" style="width:100%;height:100%;"></div>`;
  main.appendChild(mapBox);

  const mapHint = document.createElement('div');
  mapHint.className = 'map-hint';
  mapHint.textContent = t('mapClickHint');
  main.appendChild(mapHint);

  const listTitle = document.createElement('div');
  listTitle.className = 'pin-list-title';
  listTitle.textContent = t('pinListTitle');
  main.appendChild(listTitle);

  const list = document.createElement('div');
  list.className = 'item-list';
  main.appendChild(list);

  // 저장된 핀 목록(지도 아래 칩 리스트)을 다시 그리는 내부 함수.
  // 핀을 추가/수정/삭제할 때마다(openPinModal의 콜백으로) 호출되어 목록을 최신 상태로 갱신함.
  function renderPinList() {
    const data = loadLocationData(menu);
    list.innerHTML = '';
    if (!data.length) {
      list.appendChild(makeEmptyHint(t('pinEmptyHint')));
      return;
    }
    data.forEach(pin => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pin-chip';
      chip.innerHTML = `
        <span class="pin-dot"></span>
        <span class="pin-info">
          <div class="pin-name">${escapeHtml(pin.name)}</div>
          <div class="pin-sub">${escapeHtml(pin.address || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`)}</div>
        </span>
      `;
      chip.addEventListener('click', () => {
        openPinModal(menu, pin.lat, pin.lng, pin, () => {
          renderPinList();
          const inst = mapInstances[menu.id];
          if (inst && inst.refreshMarkers) inst.refreshMarkers(); // 목록에서 삭제/수정해도 지도 위 마커가 같이 갱신되도록
        });
        const inst = mapInstances[menu.id];
        if (inst) inst.map.panTo({ lat: pin.lat, lng: pin.lng });
      });
      list.appendChild(chip);
    });
  }
  renderPinList();

  // 지도 SDK 로드가 끝나면 실제 지도를 생성. 실패 시(키 없음/로드 실패) 지도 대신 안내 문구를 표시.
  loadGoogleMaps().then(google => {
    initMap(google, menu, document.getElementById(mapDivId), renderPinList);
  }).catch(err => {
    mapBox.innerHTML = `<div class="map-placeholder">${err.message === 'NO_KEY' ? t('mapNoKey') : t('mapLoadFail')}</div>`;
  });
}

// 검색창에 입력한 글자로 장소를 찾아 지도를 그 위치로 이동시킴.
// 지도를 클릭했을 때 좌표->주소 역변환에 쓰는 것과 같은 Geocoder를 먼저 시도하고
// (이미 정상 동작 중인 기능이라 가장 안전함), 주소로 못 찾으면(상호명 검색 등)
// PlacesService.textSearch로 한 번 더 시도하는 2단계 방식.
// (예전에 쓰던 google.maps.places.Autocomplete 위젯은 최근 발급된 API 키에서
//  더 이상 지원되지 않아 지도 전체가 깨지는 원인이 되어 제거하고 이 방식으로 대체함)
function searchPlaceAndMoveMap(placesService, geocoder, map, query) {
  if (!query) return;
  geocoder.geocode({ address: query }, (geoResults, geoStatus) => {
    if (geoStatus === 'OK' && geoResults && geoResults[0]) {
      map.panTo(geoResults[0].geometry.location);
      map.setZoom(15);
      return;
    }
    console.warn('[장소 검색] Geocoder 실패(', geoStatus, ') - Places 검색으로 재시도:', query);
    placesService.textSearch({ query, location: map.getCenter() }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].geometry) {
        map.panTo(results[0].geometry.location);
        map.setZoom(15);
      } else {
        console.warn('[장소 검색] Places 검색도 실패:', status, query);
      }
    });
  });
}

// Google 지도 인스턴스를 실제로 생성하고, 저장된 핀 마커/지도 클릭(새 핀 추가)/
// 주변 장소 마커/장소 검색 자동완성까지 연결하는 핵심 함수.
// onPinsChanged: 핀 목록이 바뀌었을 때 상위(renderLocationView)의 renderPinList를 다시 부르기 위한 콜백.
function initMap(google, menu, mapDiv, onPinsChanged) {
  const data = loadLocationData(menu);
  // 지도 중심: 내 위치(userLocation) > 첫 저장 핀 위치 > 서울시청(기본값) 순으로 사용
  const initialCenter = userLocation || (data.length ? { lat: data[0].lat, lng: data[0].lng } : { lat: 37.5665, lng: 126.9780 });
  const map = new google.maps.Map(mapDiv, {
    center: initialCenter,
    zoom: userLocation ? 15 : 14,
    mapTypeControl: false,
    streetViewControl: false,
    clickableIcons: false
  });

  const geocoder = new google.maps.Geocoder();
  const placesService = new google.maps.places.PlacesService(map);
  const infoWindow = new google.maps.InfoWindow();

  mapInstances[menu.id] = { map, markers: {}, nearbyMarkers: [] };

  // 사용자가 저장한 핀들의 마커를 전부 지우고 최신 데이터로 다시 그림.
  // 핀을 추가/수정/삭제한 뒤 이 함수를 다시 호출해 지도 위 마커를 최신 상태로 맞춤.
  function refreshUserMarkers() {
    const inst = mapInstances[menu.id];
    Object.values(inst.markers).forEach(m => m.setMap(null));
    inst.markers = {};
    loadLocationData(menu).forEach(pin => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        title: pin.name
      });
      marker.addListener('click', () => {
        openPinModal(menu, pin.lat, pin.lng, pin, () => { refreshUserMarkers(); onPinsChanged(); });
      });
      inst.markers[pin.id] = marker;
    });
  }
  mapInstances[menu.id].refreshMarkers = refreshUserMarkers; // 핀 목록(칩)에서 삭제/수정 시에도 지도 마커를 갱신할 수 있도록 노출
  refreshUserMarkers();

  // 지도를 클릭하면 그 위치에 새 핀을 기록할 수 있는 모달을 염.
  // lastMapClickAt으로 400ms 이내 중복 클릭(더블클릭 등)은 무시해 모달이 중복으로 뜨지 않게 함.
  // e.placeId가 있으면(구글이 표시하는 건물/상호 아이콘 클릭) 기본 정보창을 막기 위해 stop() 호출.
  let lastMapClickAt = 0;
  map.addListener('click', e => {
    if (e.placeId) e.stop();
    const now = Date.now();
    if (now - lastMapClickAt < 400) return;
    lastMapClickAt = now;
    openPinModal(menu, e.latLng.lat(), e.latLng.lng(), null, () => { refreshUserMarkers(); onPinsChanged(); }, geocoder);
  });

  // 현재 지도 중심 기준 반경 1200m 안의 장소(음식점, 카페 등)를 검색해
  // 작은 회색 점 마커로 표시. 지도가 움직임을 멈출 때마다('idle') 다시 검색해 갱신.
  function refreshNearbyPlaces() {
    const inst = mapInstances[menu.id];
    inst.nearbyMarkers.forEach(m => m.setMap(null));
    inst.nearbyMarkers = [];
    placesService.nearbySearch({ location: map.getCenter(), radius: 1200, type: ['establishment'] }, results => {
      if (!results) return;
      results.slice(0, 20).forEach(place => {
        if (!place.geometry || !place.geometry.location) return;
        const marker = new google.maps.Marker({
          position: place.geometry.location,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#767a82',
            fillOpacity: 0.9,
            strokeWeight: 0
          },
          title: place.name
        });
        // 주변 장소 마커를 클릭하면 이름/주소와 "핀으로 저장" 버튼이 담긴 정보창을 띄움
        marker.addListener('click', () => {
          const div = document.createElement('div');
          div.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(place.name || '')}</div>
            <div style="font-size:12px;color:#666;margin-bottom:8px;">${escapeHtml(place.vicinity || '')}</div>
          `;
          const saveBtn = document.createElement('button');
          saveBtn.textContent = t('nearbySaveAsPin');
          saveBtn.style.cssText = 'border:none;background:#4a6cf7;color:#fff;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;';
          saveBtn.addEventListener('click', () => {
            infoWindow.close();
            openPinModal(menu, place.geometry.location.lat(), place.geometry.location.lng(),
              { name: place.name, address: place.vicinity, note: '' },
              () => { refreshUserMarkers(); onPinsChanged(); }, null, true);
          });
          div.appendChild(saveBtn);
          infoWindow.setContent(div);
          infoWindow.open({ map, anchor: marker });
        });
        inst.nearbyMarkers.push(marker);
      });
    });
  }
  map.addListener('idle', refreshNearbyPlaces);

  // 상단 검색창: 엔터를 치거나 돋보기 버튼을 누르면 입력한 검색어로 지도를 이동.
  // (예전에는 google.maps.places.Autocomplete 위젯을 썼는데, 최근 발급된 API 키에서는
  //  이 위젯이 막혀 있어 "Google 지도를 제대로 로드할 수 없습니다" 오류로 지도 전체가 깨졌음.
  //  그래서 위젯 없이, 타이핑할 때는 직접 만든 자동완성 목록을 보여주고
  //  엔터/버튼 클릭 시점에는 별도로 검색을 실행하는 방식으로 대체함.)
  const searchInput = document.getElementById('placeSearchInput');
  const searchBtn = document.getElementById('placeSearchBtn');
  const suggestionsBox = document.getElementById('searchSuggestions');
  const autocompleteService = new google.maps.places.AutocompleteService();

  function hideSuggestions() {
    if (!suggestionsBox) return;
    suggestionsBox.hidden = true;
    suggestionsBox.innerHTML = '';
  }

  // 자동완성 후보 목록을 입력창 밑에 그림. 후보 항목을 누르면 그 장소 상세정보(좌표)를
  // 받아와 지도를 이동시키고, 결과가 없거나 API 오류일 때도 사용자가 알 수 있게 안내를 보여줌.
  function renderSuggestions(predictions, errorStatus) {
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';

    if (errorStatus) {
      const info = document.createElement('div');
      info.className = 'search-suggestion-item is-info';
      info.textContent = errorStatus === 'REQUEST_DENIED' ? t('mapSearchApiError') : t('mapSearchNoResult');
      suggestionsBox.appendChild(info);
      suggestionsBox.hidden = false;
      return;
    }
    if (!predictions || !predictions.length) { hideSuggestions(); return; }

    predictions.forEach(prediction => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'search-suggestion-item';
      item.textContent = prediction.description;
      item.addEventListener('click', () => {
        hideSuggestions();
        searchInput.value = prediction.description;
        placesService.getDetails({ placeId: prediction.place_id, fields: ['geometry', 'name'] }, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
            map.panTo(place.geometry.location);
            map.setZoom(15);
          } else {
            console.warn('[장소 검색] 상세 정보 조회 실패:', status, prediction.description);
          }
        });
      });
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.hidden = false;
  }

  // 타이핑할 때마다(짧은 디바운스를 둬 API 호출을 아낌) 입력한 글자를 포함하는 장소를 찾아 목록으로 보여줌.
  let suggestDebounceId = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (suggestDebounceId) clearTimeout(suggestDebounceId);
      if (!query) { hideSuggestions(); return; }
      suggestDebounceId = setTimeout(() => {
        autocompleteService.getPlacePredictions(
          { input: query, location: map.getCenter(), radius: 30000 },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              renderSuggestions(predictions, null);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              renderSuggestions(null, 'ZERO_RESULTS');
            } else {
              console.warn('[장소 검색] 자동완성 실패:', status, query);
              renderSuggestions(null, status);
            }
          }
        );
      }, 250);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') { hideSuggestions(); return; }
      if (e.key !== 'Enter') return;
      // 한글 등 조합형 입력(IME) 중에 눌린 엔터(조합 확정용 엔터)는 무시.
      // 이걸 안 걸러주면 한글 입력 중 엔터를 쳤을 때 글자가 채 완성되기 전에
      // 검색이 실행돼서 엉뚱한 검색어로 조회되거나 아무 반응이 없는 것처럼 보임.
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      hideSuggestions();
      searchPlaceAndMoveMap(placesService, geocoder, map, searchInput.value.trim());
    });
  }
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      hideSuggestions();
      searchPlaceAndMoveMap(placesService, geocoder, map, searchInput.value.trim());
    });
  }
}

// 핀 추가/조회/수정/삭제를 모두 담당하는 모달.
// existingPin이 없거나 isNewFromNearby가 true면 "새 핀 기록" 모드(신규 저장),
// 그 외에는 이미 저장된 핀을 보여주고 수정/삭제할 수 있는 모드로 동작.
// geocoder가 주어지면(지도를 직접 클릭한 경우) 좌표를 역지오코딩해 주소를 자동으로 채움.
function openPinModal(menu, lat, lng, existingPin, onSaved, geocoder, isNewFromNearby) {
  const isNew = !existingPin || isNewFromNearby;
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${isNew ? escapeHtml(t('pinModalNewTitle')) : escapeHtml(t('pinModalViewTitle'))}</h2>
    <div class="field-group">
      <label>${escapeHtml(t('pinNameLabel'))}</label>
      <input type="text" id="pinNameInput" maxlength="60" value="${escapeHtml((existingPin && existingPin.name) || '')}" placeholder="${escapeHtml(t('pinNamePlaceholder'))}">
    </div>
    <div class="field-group">
      <label>${escapeHtml(t('pinAddressLabel'))}</label>
      <input type="text" id="pinAddressInput" value="${escapeHtml((existingPin && existingPin.address) || t('pinAddressLoading'))}" readonly>
    </div>
    <div class="field-group">
      <label>${escapeHtml(t('pinNoteLabel'))}</label>
      <textarea id="pinNoteInput" placeholder="${escapeHtml(t('pinNotePlaceholder'))}">${escapeHtml((existingPin && existingPin.note) || '')}</textarea>
    </div>
    <div class="modal-actions">
      ${!isNew ? `<button type="button" class="btn btn-danger" id="pinDeleteBtn">${escapeHtml(t('btnDelete'))}</button>` : ''}
      <button type="button" class="btn" id="pinSaveBtn">${escapeHtml(t('btnSave'))}</button>
    </div>
  `;
  showModal(body);

  // 지도를 직접 클릭해 만든 새 핀은 geocoder로 좌표 -> 주소 역변환을 시도하고,
  // 그 외(핀 직접 클릭 조회, 주변 장소에서 저장)에는 이미 있는 주소를 쓰거나 좌표 문자열로 대체
  if (geocoder) {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const addrInput = document.getElementById('pinAddressInput');
      if (!addrInput) return;
      addrInput.value = (status === 'OK' && results[0]) ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    });
  } else if (!existingPin || isNewFromNearby) {
    const addrInput = document.getElementById('pinAddressInput');
    if (addrInput && !addrInput.value) addrInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  // 저장: 신규면 새 핀을 배열에 추가, 기존이면 같은 id를 찾아 내용만 갱신
  document.getElementById('pinSaveBtn').addEventListener('click', () => {
    const name = document.getElementById('pinNameInput').value.trim();
    if (!name) { document.getElementById('pinNameInput').focus(); return; }
    const address = document.getElementById('pinAddressInput').value;
    const note = document.getElementById('pinNoteInput').value.trim();

    const data = loadLocationData(menu);
    if (isNew) {
      data.push({ id: uid(), lat, lng, name, address, note, createdAt: Date.now() });
    } else {
      const target = data.find(p => p.id === existingPin.id);
      if (target) { target.name = name; target.address = address; target.note = note; }
    }
    if (!saveLocationData(menu, data)) { showStorageFullModal(); return; }
    closeModal();
    onSaved();
  });

  if (!isNew) {
    document.getElementById('pinDeleteBtn').addEventListener('click', () => {
      const data = loadLocationData(menu).filter(p => p.id !== existingPin.id);
      saveLocationData(menu, data);
      closeModal();
      onSaved();
    });
  }
}

/* ==========================================================================
   이미지형 (먹을 것 / 커스텀 이미지 메뉴)
   ========================================================================== */

// 이미지형 메뉴의 저장 데이터를 불러옴. 구조: [ {id, name, imageUrl, done}, ... ]
function loadImageData(menu) {
  return loadJSON(menu.storageKey, []);
}
function saveImageData(menu, data) {
  return saveJSON(menu.storageKey, data);
}

// 이미지형 메뉴 화면(이름 입력창, 항목 목록)을 그림.
function renderImageView(main, menu) {
  const title = document.createElement('div');
  title.className = 'view-title';
  title.textContent = menuDisplayName(menu);
  main.appendChild(title);

  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  addRow.innerHTML = `
    <input type="text" id="foodNameInput" placeholder="${escapeHtml(t('foodNamePlaceholder'))}" maxlength="40">
    <button type="button" class="btn" id="foodAddBtn">${escapeHtml(t('btnAdd'))}</button>
  `;
  main.appendChild(addRow);

  const list = document.createElement('div');
  list.className = 'item-list';
  main.appendChild(list);

  // 항목 목록(썸네일/이름/완료/삭제)을 다시 그리고 각 버튼에 이벤트를 연결.
  // 이미지 선택 모달이나 완료/삭제를 처리한 뒤 이 함수를 다시 호출해 목록만 갱신함
  // (renderMain() 전체를 다시 그리지 않아 이미지 선택 흐름 중 화면이 끊기지 않게 함).
  function renderList() {
    const data = loadImageData(menu);
    list.innerHTML = '';
    if (!data.length) {
      list.appendChild(makeEmptyHint(t('foodEmptyHint')));
      return;
    }
    data.forEach(item => {
      const row = document.createElement('div');
      row.className = 'food-item';
      row.innerHTML = `
        ${item.imageUrl
          ? `<img class="food-thumb" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">`
          : `<div class="food-thumb-placeholder">🍽</div>`}
        <button type="button" class="food-name-btn ${item.done ? 'done' : ''}" data-view="${item.id}">${escapeHtml(item.name)}</button>
        <button type="button" class="todo-check ${item.done ? 'done' : ''}" data-id="${item.id}">${item.done ? '✓' : ''}</button>
        <button type="button" class="icon-btn" data-del="${item.id}" title="${escapeHtml(t('btnDelete'))}">✕</button>
      `;
      list.appendChild(row);
    });

    // 이름 클릭 -> 큰 이미지 보기/변경/삭제 모달
    list.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = loadImageData(menu).find(i => i.id === btn.dataset.view);
        if (item) openFoodDetailModal(menu, item, renderList);
      });
    });
    // 완료 체크 토글
    list.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = loadImageData(menu);
        const target = data.find(i => i.id === btn.dataset.id);
        if (target) target.done = !target.done;
        saveImageData(menu, data);
        renderList();
      });
    });
    // 항목 삭제
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveImageData(menu, loadImageData(menu).filter(i => i.id !== btn.dataset.del));
        renderList();
      });
    });
  }
  renderList();

  // 새 항목 추가: 이름만 먼저 빈 이미지로 저장한 뒤, 바로 이미지 선택 모달을 열어
  // 사용자가 사진을 고르거나 "나중에 하기"로 건너뛸 수 있게 함.
  const doAdd = () => {
    const input = document.getElementById('foodNameInput');
    const name = input.value.trim();
    if (!name) return;
    const data = loadImageData(menu);
    const newItem = { id: uid(), name, imageUrl: '', done: false };
    data.push(newItem);
    if (!saveImageData(menu, data)) { showStorageFullModal(); return; }
    input.value = '';
    renderList();
    openImagePickModal(menu, newItem, renderList);
  };
  document.getElementById('foodAddBtn').addEventListener('click', doAdd);
  document.getElementById('foodNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
}

// 항목에 넣을 이미지를 고르는 모달. 세 가지 방법을 제공:
// 1) 기기 파일 선택(input[type=file]), 2) 구글 이미지 검색 새 창을 띄운 뒤 이미지를 복사해 붙여넣기,
// 3) 클립보드 붙여넣기 버튼(Clipboard API)으로 직접 읽어오기.
// 어떤 방법으로 받아오든 handleImageBlob()에서 resizeImageBlob()으로 리사이즈한 뒤 미리보기로 보여주고,
// "저장"을 눌러야 실제 항목 데이터(imageUrl)에 반영됨(중간에 닫으면 저장 안 됨).
function openImagePickModal(menu, item, onSaved) {
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(t('imgPickTitle', item.name))}</h2>

    <button type="button" class="btn btn-block" id="pickDeviceImgBtn" style="margin-bottom:14px;">${escapeHtml(t('imgPickFileBtn'))}</button>
    <input type="file" id="imgFileInput" accept="image/*" hidden>

    <div class="modal-divider">${escapeHtml(t('orDivider'))}</div>

    <p class="modal-sub">${escapeHtml(t('imgPickInstructions'))}</p>
    <button type="button" class="btn btn-secondary btn-block" id="openImgSearchBtn" style="margin-bottom:10px;">${escapeHtml(t('imgSearchOpenBtn'))}</button>
    <div class="paste-zone" id="imgPasteZone" tabindex="0">${escapeHtml(t('imgPasteZoneLabel'))}</div>
    <button type="button" class="btn btn-secondary btn-block" id="pasteClipboardBtn" style="margin-bottom:14px;">${escapeHtml(t('imgPasteBtn'))}</button>

    <div class="image-preview-box" id="imgPreviewBox">${escapeHtml(t('imgPreviewPlaceholder'))}</div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="imgSkipBtn">${escapeHtml(t('btnSkip'))}</button>
      <button type="button" class="btn" id="imgSaveBtn">${escapeHtml(t('btnSave'))}</button>
    </div>
  `;
  showModal(body);

  let pendingDataUrl = ''; // 아직 저장 버튼을 누르지 않은, 미리보기 중인 이미지(base64)
  const previewBox = document.getElementById('imgPreviewBox');
  const pasteZone = document.getElementById('imgPasteZone');
  pasteZone.focus(); // 모달이 열리자마자 붙여넣기(Ctrl+V) 영역에 포커스를 줘서 바로 paste 이벤트를 받을 수 있게 함

  // 어느 경로로 들어오든(파일 선택/드래그 paste/클립보드 API) 이미지 Blob은 이 함수로 모여
  // 리사이즈 후 미리보기에 반영됨
  async function handleImageBlob(blob) {
    if (!blob) return;
    try {
      pendingDataUrl = await resizeImageBlob(blob);
      previewBox.innerHTML = `<img src="${pendingDataUrl}" alt="preview">`;
    } catch (err) {
      previewBox.textContent = t('imgPasteFailed');
    }
  }

  document.getElementById('pickDeviceImgBtn').addEventListener('click', () => {
    document.getElementById('imgFileInput').click();
  });

  document.getElementById('imgFileInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageBlob(file);
  });

  // 새 팝업 창으로 구글 이미지 검색을 열어줌 (검색어는 항목 이름)
  document.getElementById('openImgSearchBtn').addEventListener('click', () => {
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(item.name)}`;
    window.open(url, 'googleImageSearch', 'width=420,height=640,noopener,noreferrer');
  });

  // 붙여넣기 영역에 포커스된 상태에서 Ctrl+V를 누르면 브라우저의 'paste' 이벤트로 이미지를 받음
  pasteZone.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const clipItem of items) {
      if (clipItem.type && clipItem.type.startsWith('image/')) {
        e.preventDefault();
        handleImageBlob(clipItem.getAsFile());
        return;
      }
    }
  });

  // 버튼을 눌러 Clipboard API로 직접 클립보드를 읽는 방식(모바일 등 paste 이벤트가 잘 안 먹는 환경 대응)
  document.getElementById('pasteClipboardBtn').addEventListener('click', async () => {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      previewBox.textContent = t('imgPasteFailed');
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipItem of clipboardItems) {
        const imageType = clipItem.types.find(ty => ty.startsWith('image/'));
        if (imageType) {
          await handleImageBlob(await clipItem.getType(imageType));
          return;
        }
      }
      previewBox.textContent = t('imgPasteNoImage');
    } catch (err) {
      previewBox.textContent = t('imgPasteFailed');
    }
  });

  document.getElementById('imgSkipBtn').addEventListener('click', closeModal);
  // 저장: 미리보기 중이던 이미지가 있을 때만(pendingDataUrl) 실제 항목 데이터에 반영
  document.getElementById('imgSaveBtn').addEventListener('click', () => {
    if (pendingDataUrl) {
      const data = loadImageData(menu);
      const target = data.find(i => i.id === item.id);
      if (target) target.imageUrl = pendingDataUrl;
      if (!saveImageData(menu, data)) { showStorageFullModal(); return; }
    }
    closeModal();
    onSaved();
  });
}

// 이미지형 항목의 이름을 클릭했을 때 뜨는 상세 모달. 큰 이미지를 보여주고,
// "이미지 변경"(openImagePickModal 다시 열기) 또는 "삭제"를 할 수 있음.
function openFoodDetailModal(menu, item, onChanged) {
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(item.name)}</h2>
    ${item.imageUrl ? `<img class="lightbox-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : `<div class="image-preview-box">${escapeHtml(t('foodNoImage'))}</div>`}
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="foodChangeImgBtn">${escapeHtml(t('btnChangeImg'))}</button>
      <button type="button" class="btn btn-danger" id="foodDeleteBtn">${escapeHtml(t('btnDelete'))}</button>
    </div>
  `;
  showModal(body);

  document.getElementById('foodChangeImgBtn').addEventListener('click', () => {
    closeModal();
    openImagePickModal(menu, item, onChanged);
  });
  document.getElementById('foodDeleteBtn').addEventListener('click', () => {
    saveImageData(menu, loadImageData(menu).filter(i => i.id !== item.id));
    closeModal();
    onChanged();
  });
}

/* ==========================================================================
   메뉴 추가 (+)
   ========================================================================== */

// 하단 네비게이션의 [+] 버튼을 눌렀을 때 여는 첫 모달.
// "새 메뉴 추가"와 "메뉴 관리" 중 하나를 고르게 한 뒤 각각의 모달로 넘겨줌.
function openMenuChoiceModal() {
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(t('menuChooseTitle'))}</h2>
    <div class="radio-group">
      <button type="button" class="radio-option menu-choice-btn" id="chooseAddMenuBtn">
        <span>
          <span class="radio-title">${escapeHtml(t('menuChooseAddTitle'))}</span>
          <span class="radio-desc">${escapeHtml(t('menuChooseAddDesc'))}</span>
        </span>
      </button>
      <button type="button" class="radio-option menu-choice-btn" id="chooseManageMenuBtn">
        <span>
          <span class="radio-title">${escapeHtml(t('menuChooseManageTitle'))}</span>
          <span class="radio-desc">${escapeHtml(t('menuChooseManageDesc'))}</span>
        </span>
      </button>
    </div>
  `;
  showModal(body);

  document.getElementById('chooseAddMenuBtn').addEventListener('click', () => {
    closeModal();
    openAddMenuFormModal();
  });
  document.getElementById('chooseManageMenuBtn').addEventListener('click', () => {
    closeModal();
    openManageMenuModal();
  });
}

// 커스텀 메뉴의 이름을 바꾸거나 삭제할 수 있는 모달.
// 기본 메뉴(할 일/갈 곳/먹을 것)는 앱 핵심 기능과 맞물려 있어 관리 대상에서 제외하고,
// 사용자가 [+]로 추가한 커스텀 메뉴만 대상으로 함.
function openManageMenuModal() {
  const body = document.createElement('div');
  const custom = loadCustomMenus();

  body.innerHTML = `
    <h2>${escapeHtml(t('manageMenuTitle'))}</h2>
    ${custom.length === 0
      ? `<p class="modal-sub">${escapeHtml(t('manageMenuEmpty'))}</p>`
      : `<div class="item-list menu-manage-list"></div><p class="modal-sub">${escapeHtml(t('manageMenuNote'))}</p>`}
  `;
  showModal(body);
  if (custom.length === 0) return;

  const list = body.querySelector('.menu-manage-list');
  custom.forEach(menu => {
    const row = document.createElement('div');
    row.className = 'menu-manage-item';
    row.innerHTML = `
      <input type="text" class="menu-manage-name" data-id="${menu.id}" maxlength="10" value="${escapeHtml(menu.name)}">
      <button type="button" class="icon-btn" data-del="${menu.id}" title="${escapeHtml(t('btnDelete'))}">✕</button>
    `;
    list.appendChild(row);
  });

  // 메뉴 이름 수정: 입력창 값이 바뀌고 포커스를 벗어나면 바로 저장
  list.querySelectorAll('.menu-manage-name').forEach(input => {
    input.addEventListener('change', () => {
      const name = input.value.trim();
      if (!name) { input.value = findMenu(input.dataset.id)?.name || ''; return; }
      const menus = loadCustomMenus();
      const target = menus.find(m => m.id === input.dataset.id);
      if (!target) return;
      target.name = name;
      saveCustomMenus(menus);
      input.value = name;
      renderNav();
      if (activeMenuId === target.id) renderMain();
    });
  });

  // 메뉴 삭제: 목록/저장된 항목 데이터를 함께 지우고, 지금 보고 있는 메뉴였다면 홈으로 이동
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const menuId = btn.dataset.del;
      const menus = loadCustomMenus().filter(m => m.id !== menuId);
      saveCustomMenus(menus);
      localStorage.removeItem(`todoapp_custom_${menuId}`);

      if (activeMenuId === menuId) {
        activeMenuId = null;
        saveJSON(STORAGE_KEYS.lastActiveMenu, null);
      }
      renderNav();
      renderMain();
      closeModal();
      openManageMenuModal();
    });
  });
}

// 이미 커스텀 메뉴가 MAX_CUSTOM_MENUS(5)개면 추가 대신 안내 모달만 보여주고 끝냄.
// 그 외에는 이름/유형(text/location/image)을 입력받아 새 커스텀 메뉴를 만들고,
// 저장 후 바로 그 메뉴로 이동(setActiveMenu)시킴.
function openAddMenuFormModal() {
  const custom = loadCustomMenus();
  if (custom.length >= MAX_CUSTOM_MENUS) {
    const body = document.createElement('div');
    body.innerHTML = `
      <h2>${escapeHtml(t('menuLimitTitle'))}</h2>
      <p class="modal-sub">${escapeHtml(t('menuLimitDesc', MAX_CUSTOM_MENUS))}</p>
      <button type="button" class="btn btn-block" id="closeLimitBtn">${escapeHtml(t('btnConfirm'))}</button>
    `;
    showModal(body);
    document.getElementById('closeLimitBtn').addEventListener('click', closeModal);
    return;
  }

  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(t('addMenuTitle'))}</h2>
    <div class="field-group">
      <label>${escapeHtml(t('menuNameLabel'))}</label>
      <input type="text" id="newMenuName" maxlength="10" placeholder="${escapeHtml(t('menuNamePlaceholder'))}">
    </div>
    <div class="field-group">
      <label>${escapeHtml(t('menuTypeLabel'))}</label>
      <div class="radio-group">
        <label class="radio-option">
          <input type="radio" name="menuType" value="text" checked>
          <span>
            <span class="radio-title">${escapeHtml(t('typeTextTitle'))}</span>
            <span class="radio-desc">${escapeHtml(t('typeTextDesc'))}</span>
          </span>
        </label>
        <label class="radio-option">
          <input type="radio" name="menuType" value="location">
          <span>
            <span class="radio-title">${escapeHtml(t('typeLocationTitle'))}</span>
            <span class="radio-desc">${escapeHtml(t('typeLocationDesc'))}</span>
          </span>
        </label>
        <label class="radio-option">
          <input type="radio" name="menuType" value="image">
          <span>
            <span class="radio-title">${escapeHtml(t('typeImageTitle'))}</span>
            <span class="radio-desc">${escapeHtml(t('typeImageDesc'))}</span>
          </span>
        </label>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="cancelAddMenuBtn">${escapeHtml(t('btnCancel'))}</button>
      <button type="button" class="btn" id="saveAddMenuBtn">${escapeHtml(t('btnAddMenu'))}</button>
    </div>
    <div class="menu-limit-note">${escapeHtml(t('menuUsageNote', custom.length, MAX_CUSTOM_MENUS))}</div>
  `;
  showModal(body);

  document.getElementById('cancelAddMenuBtn').addEventListener('click', closeModal);
  document.getElementById('saveAddMenuBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('newMenuName');
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const type = document.querySelector('input[name="menuType"]:checked').value;

    const menus = loadCustomMenus();
    if (menus.length >= MAX_CUSTOM_MENUS) { closeModal(); return; } // 모달이 열려있는 동안 다른 탭 등에서 한도가 찼을 수 있어 저장 직전에도 재확인
    const newMenu = { id: uid(), name, type };
    menus.push(newMenu);
    saveCustomMenus(menus);

    closeModal();
    renderNav();
    setActiveMenu(newMenu.id);
  });
}

/* ==========================================================================
   설정 모달
   ========================================================================== */

// 상단 톱니바퀴 버튼을 눌렀을 때 여는 설정 모달.
// 글씨 크기/글꼴/굵기는 select 값이 바뀌자마자(change) 바로 적용/저장되고,
// 언어는 바뀌면 전체 화면을 다시 그려야 하므로 applyLanguage() 후 모달을 닫았다가
// 새 언어로 다시 열어(재귀 호출) 모달 안의 문구도 즉시 갱신되게 함.
// 테마는 라이트/다크/컬러 설정 중 고르며, "컬러 설정"을 선택했을 때만 포인트 컬러 선택기를 보여줌.
function openSettingsModal() {
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(t('settingsTitle'))}</h2>

    <div class="field-group">
      <label>${escapeHtml(t('settingsFontSize'))}</label>
      <select id="setFontSize">
        <option value="sm">${escapeHtml(t('fontSizeSmall'))}</option>
        <option value="md">${escapeHtml(t('fontSizeMedium'))}</option>
        <option value="lg">${escapeHtml(t('fontSizeLarge'))}</option>
        <option value="xl">${escapeHtml(t('fontSizeXLarge'))}</option>
      </select>
    </div>

    <div class="field-group">
      <label>${escapeHtml(t('settingsFontFamily'))}</label>
      <select id="setFontFamily">
        <option value="system">${escapeHtml(t('fontSystem'))}</option>
        <option value="gothic">${escapeHtml(t('fontGothic'))}</option>
        <option value="serif">${escapeHtml(t('fontSerif'))}</option>
        <option value="rounded">${escapeHtml(t('fontRounded'))}</option>
        <option value="mono">${escapeHtml(t('fontMono'))}</option>
      </select>
    </div>

    <div class="field-group">
      <label>${escapeHtml(t('settingsFontWeight'))}</label>
      <select id="setFontWeight">
        <option value="300">${escapeHtml(t('weightLight'))}</option>
        <option value="400">${escapeHtml(t('weightNormal'))}</option>
        <option value="600">${escapeHtml(t('weightBold'))}</option>
        <option value="800">${escapeHtml(t('weightXBold'))}</option>
      </select>
    </div>

    <div class="field-group">
      <label>${escapeHtml(t('settingsLanguage'))}</label>
      <div class="toggle-group" id="langToggleGroup">
        <button type="button" class="toggle-btn" data-lang="ko">${escapeHtml(t('langKo'))}</button>
        <button type="button" class="toggle-btn" data-lang="en">${escapeHtml(t('langEn'))}</button>
      </div>
    </div>

    <div class="field-group">
      <label>${escapeHtml(t('settingsTheme'))}</label>
      <div class="toggle-group" id="themeToggleGroup">
        <button type="button" class="toggle-btn" data-theme="light">${escapeHtml(t('themeLight'))}</button>
        <button type="button" class="toggle-btn" data-theme="dark">${escapeHtml(t('themeDark'))}</button>
        <button type="button" class="toggle-btn" data-theme="custom">${escapeHtml(t('themeCustom'))}</button>
      </div>
    </div>

    <div class="field-group" id="accentColorGroup" ${appSettings.themeMode === 'custom' ? '' : 'hidden'}>
      <label>${escapeHtml(t('themeAccentLabel'))}</label>
      <input type="color" id="setAccentColor" value="${appSettings.customAccent}">
    </div>

    <button type="button" class="btn btn-block" id="closeSettingsBtn">${escapeHtml(t('btnClose'))}</button>
  `;
  showModal(body);

  // select의 현재 값을 appSettings에 맞춰 초기 선택 상태로 지정
  document.getElementById('setFontSize').value = appSettings.fontSize;
  document.getElementById('setFontFamily').value = appSettings.fontFamily;
  document.getElementById('setFontWeight').value = appSettings.fontWeight;

  document.getElementById('setFontSize').addEventListener('change', e => {
    appSettings.fontSize = e.target.value; saveSettings(); applyFontSettings();
  });
  document.getElementById('setFontFamily').addEventListener('change', e => {
    appSettings.fontFamily = e.target.value; saveSettings(); applyFontSettings();
  });
  document.getElementById('setFontWeight').addEventListener('change', e => {
    appSettings.fontWeight = e.target.value; saveSettings(); applyFontSettings();
  });

  // 언어/테마 토글 그룹에서 현재 선택된 버튼에 'active' 클래스를 부여하는 공용 헬퍼
  function syncToggleActive(groupId, dataKey, value) {
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset[dataKey] === value);
    });
  }
  syncToggleActive('langToggleGroup', 'lang', appSettings.language);
  syncToggleActive('themeToggleGroup', 'theme', appSettings.themeMode);

  document.querySelectorAll('#langToggleGroup .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (appSettings.language === btn.dataset.lang) return;
      appSettings.language = btn.dataset.lang;
      saveSettings();
      applyLanguage();
      // 언어가 바뀌면 이 모달 안의 문구들도 새 언어로 다시 그려야 하므로, 닫고 같은 모달을 다시 염
      closeModal();
      openSettingsModal();
    });
  });

  document.querySelectorAll('#themeToggleGroup .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appSettings.themeMode = btn.dataset.theme;
      saveSettings();
      applyTheme();
      syncToggleActive('themeToggleGroup', 'theme', appSettings.themeMode);
      document.getElementById('accentColorGroup').hidden = appSettings.themeMode !== 'custom';
    });
  });

  document.getElementById('setAccentColor').addEventListener('input', e => {
    appSettings.customAccent = e.target.value;
    saveSettings();
    applyTheme();
  });

  document.getElementById('closeSettingsBtn').addEventListener('click', closeModal);
}

/* ==========================================================================
   모달 공통
   ========================================================================== */

// 공용 모달 틀(#modalOverlay/#modalBox)에 contentEl을 채우고 화면에 표시.
// 우측 상단 닫기(✕) 버튼은 여기서 매번 자동으로 추가해줌.
function showModal(contentEl) {
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.innerHTML = '';
  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'modal-close-x';
  closeX.textContent = '✕';
  closeX.addEventListener('click', closeModal);
  box.appendChild(closeX);
  box.appendChild(contentEl);
  overlay.hidden = false;
}

// localStorage 저장 용량이 가득 차 saveJSON()이 실패했을 때(false 반환) 띄우는 안내 모달.
// 텍스트/사진 등을 추가하려던 동작은 그대로 저장되지 않은 채 중단되고, 이 모달로 이유만 알려줌.
function showStorageFullModal() {
  const body = document.createElement('div');
  body.innerHTML = `
    <h2>${escapeHtml(t('storageFullTitle'))}</h2>
    <p class="modal-sub">${escapeHtml(t('storageFullMessage'))}</p>
    <button type="button" class="btn btn-block" id="closeStorageFullBtn">${escapeHtml(t('btnConfirm'))}</button>
  `;
  showModal(body);
  document.getElementById('closeStorageFullBtn').addEventListener('click', closeModal);
}

// 모달을 숨기고 내용을 비움 (다음에 다른 모달을 열 때 이전 내용/이벤트가 남아있지 않도록).
function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
  document.getElementById('modalBox').innerHTML = '';
}

/* ==========================================================================
   상단 날짜 표시 + 달력
   ========================================================================== */

// 상단 날짜 버튼의 텍스트를 selectedDate 기준으로 갱신.
function renderHeaderDate() {
  const el = document.getElementById('dateText');
  el.textContent = formatDisplayDate(selectedDate);
}

// 날짜 버튼 아래 실시간 시계를 현재 시각(HH:MM:SS)으로 갱신.
// (헤더 시계 표시를 주석 처리하여 비활성화함 - index.html의 #headerClock도 함께 주석 처리됨)
// function renderClock() {
//   const el = document.getElementById('headerClock');
//   const now = new Date();
//   const pad = n => String(n).padStart(2, '0');
//   el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
// }

// 날짜 버튼을 눌렀을 때 달력 팝업을 열고 닫음.
function toggleCalendar() {
  const popup = document.getElementById('calendarPopup');
  if (popup.hidden) openCalendar(); else popup.hidden = true;
}

// 달력을 selectedDate가 속한 연/월로 초기화해서 연 뒤 표시.
function openCalendar() {
  const base = parseISO(selectedDate);
  calendarViewYear = base.getFullYear();
  calendarViewMonth = base.getMonth();
  buildCalendar();
  document.getElementById('calendarPopup').hidden = false;
}

// 텍스트형 메뉴들(할 일 등) 중 항목이 1개라도 있는 날짜를 모두 모아 Set으로 반환.
// buildCalendar()에서 해당 날짜 칸에 점(.has-data)을 찍어주는 데 사용됨.
function collectDatesWithData() {
  const set = new Set();
  getAllMenus().filter(m => m.type === 'text').forEach(menu => {
    const data = loadTextData(menu);
    Object.keys(data).forEach(dateKey => {
      if (data[dateKey] && data[dateKey].length) set.add(dateKey);
    });
  });
  return set;
}

// calendarViewYear/calendarViewMonth 기준으로 달력 팝업 내용(월 라벨, 요일, 날짜 칸)을 전부 새로 그림.
// 이전달/다음달 버튼, 날짜 칸 클릭 시 selectedDate를 바꾸고 메인 화면을 다시 그리는 이벤트도 여기서 연결.
function buildCalendar() {
  const label = document.getElementById('calMonthLabel');
  const locale = appSettings.language === 'en' ? 'en-US' : 'ko-KR';
  label.textContent = new Date(calendarViewYear, calendarViewMonth, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  renderWeekdayHeaders();

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const lastDate = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const today = todayISO();
  const datesWithData = collectDatesWithData();

  // 1일이 시작되는 요일 앞까지는 빈 칸으로 채워 요일 정렬을 맞춤
  for (let i = 0; i < firstDay; i++) {
    const span = document.createElement('span');
    span.className = 'cal-day is-empty';
    grid.appendChild(span);
  }

  for (let day = 1; day <= lastDate; day++) {
    const iso = isoOf(calendarViewYear, calendarViewMonth, day);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    if (iso === today) btn.classList.add('is-today');
    if (iso === selectedDate) btn.classList.add('is-selected');
    if (datesWithData.has(iso)) btn.classList.add('has-data');
    btn.textContent = String(day);
    btn.addEventListener('click', () => {
      selectedDate = iso;
      document.getElementById('calendarPopup').hidden = true;
      renderHeaderDate();
      renderMain();
    });
    grid.appendChild(btn);
  }
}

/* ==========================================================================
   초기화
   ========================================================================== */

// 페이지 로드 시 한 번 실행되는 진입점.
// 저장된 설정/위치 권한을 불러와 화면에 반영하고, 헤더/달력/모달의 모든 클릭 이벤트를
// 이곳에서 한 번에 연결한 뒤, 네비게이션과 메인 화면을 처음으로 그림.
function init() {
  loadSettings();
  applyFontSettings();
  applyTheme();
  updateStaticLabels();
  renderWeekdayHeaders();
  renderHeaderDate();
  // renderClock();
  requestUserLocationOnce();

  // 자정을 넘기는 등 날짜가 바뀌는 경우를 대비해, 오늘 날짜를 보고 있을 때만 30초마다 헤더 날짜를 재확인
  setInterval(() => {
    if (selectedDate === todayISO()) renderHeaderDate();
  }, 30000);

  // 실시간 시계는 1초마다 갱신 (주석 처리로 비활성화됨)
  // setInterval(renderClock, 1000);

  // 로고 클릭 -> 홈 화면으로 이동
  document.getElementById('logoBtn').addEventListener('click', () => {
    activeMenuId = null;
    renderNav();
    renderMain();
  });

  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

  // 날짜 버튼/달력 이전달/다음달/오늘로 이동 버튼
  document.getElementById('dateBtn').addEventListener('click', e => {
    e.stopPropagation(); // 아래 document 클릭 리스너가 곧바로 팝업을 닫아버리지 않도록 이벤트 버블링 차단
    toggleCalendar();
  });
  document.getElementById('calPrev').addEventListener('click', () => {
    calendarViewMonth--;
    if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
    buildCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calendarViewMonth++;
    if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
    buildCalendar();
  });
  document.getElementById('calTodayBtn').addEventListener('click', () => {
    selectedDate = todayISO();
    document.getElementById('calendarPopup').hidden = true;
    renderHeaderDate();
    renderMain();
  });

  // 달력 팝업 바깥을 클릭하면 자동으로 닫히게 함 (dateBtn 클릭 자체는 위에서 stopPropagation으로 예외 처리됨)
  document.addEventListener('click', e => {
    const popup = document.getElementById('calendarPopup');
    const display = document.getElementById('dateDisplay');
    if (!popup.hidden && !display.contains(e.target)) popup.hidden = true;
  });

  // 장소 검색 자동완성 목록 바깥을 클릭하면 자동으로 닫히게 함.
  // '갈 곳' 화면에 들어갈 때마다 검색창/목록이 새로 그려지므로, 매번 새 리스너를
  // 붙이는 대신 여기서 매 클릭마다 최신 요소를 다시 찾아서 확인하는 방식으로 하나만 등록.
  document.addEventListener('click', e => {
    const box = document.getElementById('searchSuggestions');
    const toolbar = document.querySelector('.map-toolbar');
    if (box && !box.hidden && toolbar && !toolbar.contains(e.target)) {
      box.hidden = true;
      box.innerHTML = '';
    }
  });

  // 모달 바깥(반투명 오버레이) 클릭 또는 Esc 키로 모달 닫기
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  renderNav();
  renderMain();
}

document.addEventListener('DOMContentLoaded', init);
