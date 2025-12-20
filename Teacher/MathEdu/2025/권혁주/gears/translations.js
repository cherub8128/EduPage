// translations.js - Language dictionaries

export const translations = {
    ko: {
        // General UI
        simulationMode: '시뮬레이션 모드',
        unit: '단위 (Unit)',
        principleTitle: '💡 작동 원리',

        // Mode names
        modePlanetary: '유성 기어',
        modeHarmonic: '하모닉 드라이브',
        modeCycloidal: '사이클로이드',

        // Titles
        titlePlanetary: '유성 기어 계산기',
        titleHarmonic: '하모닉 드라이브 계산기',
        titleCycloidal: '사이클로이드 계산기',

        // Component names
        sunGear: '선 기어 (Sun)',
        planetGear: '유성 기어 (Planet)',
        ringGear: '링 기어 (Ring) 🔒',
        carrier: '캐리어 (Carrier)',
        waveGen: '웨이브 제너레이터 🔄',
        flexspline: '플렉스스플라인 (출력) ⚙️',
        circularSpline: '서큘러 스플라인 🔒',
        eccentric: '입력축 (Eccentric) 🔄',
        cycloidDisc: '사이클로이드 디스크 ⚙️',
        pinWheel: '핀 휠 (Pin Wheel) 🔒',

        // Config
        config: '기어 잇수 설정',
        settings: '설정',
        sunTeeth: '선 기어 (S)',
        ringTeeth: '링 기어 (R)',
        planetTeeth: '유성 기어 (P)',
        flexTeeth: '플렉스 (F)',
        circTeeth: '서큘러 (C)',
        discLobes: '로브 수',
        numPins: '핀 개수',
        updateBtn: '업데이트',

        // Fields
        torque: '토크',
        speed: '속도',
        status: '상태',
        fixed: '고정됨 (Fixed)',

        // Info
        gearRatio: '기어비:',
        reductionRatio: '감속비:',

        // Descriptions
        descPlanetary: '<strong>선 기어(Sun)</strong>가 회전하면 <strong>유성 기어(Planet)</strong>가 자전하며 링 기어 내부를 공전합니다. <strong>링 기어(Ring)</strong>는 고정되어 있고, <strong>캐리어(Carrier)</strong>가 유성 기어들을 연결하여 감속된 출력을 전달합니다. 높은 토크와 컴팩트한 구조가 특징입니다.',
        descHarmonic: '<strong>웨이브 제너레이터(Wave Gen)</strong>는 타원형 캠으로 회전하며 <strong>플렉스스플라인(Flexspline)</strong>을 변형시킵니다. 플렉스스플라인은 유연한 금속 재질로 타원 형태로 변형되어 <strong>서큘러 스플라인(Circular, 고정)</strong>과 일부만 맞물립니다. 잇수 차이(보통 2개)로 인해 매우 큰 감속비(1:50~200)를 얻습니다.',
        descCycloidal: '<strong>입력축(Eccentric)</strong>이 회전하면 편심된 캠이 <strong>사이클로이드 디스크</strong>를 흔들리게(Wobble) 합니다. 디스크의 로브가 <strong>핀 휠(고정)</strong>의 핀들과 순차적으로 맞물리며 느린 회전 운동으로 변환됩니다. 높은 토크와 진동 최소화가 특징입니다.',

        // Alerts
        alertInvalidTeeth: '유효하지 않거나 조건을 만족하지 않는 잇수입니다.',
        alertInvalidFlex: '플렉스 잇수는 50 이상, 서큘러는 플렉스보다 커야 합니다.',
        alertInvalidCycloidal: '로브 수는 5 이상, 핀 개수는 로브 수보다 커야 합니다.',
    },

    en: {
        // General UI
        simulationMode: 'Simulation Mode',
        unit: 'Unit',
        principleTitle: '💡 Working Principle',

        // Mode names
        modePlanetary: 'Planetary Gear',
        modeHarmonic: 'Harmonic Drive',
        modeCycloidal: 'Cycloidal Drive',

        // Titles
        titlePlanetary: 'Planetary Gear Calculator',
        titleHarmonic: 'Harmonic Drive Calculator',
        titleCycloidal: 'Cycloidal Drive Calculator',

        // Component names
        sunGear: 'Sun Gear',
        planetGear: 'Planet Gear',
        ringGear: 'Ring Gear 🔒',
        carrier: 'Carrier',
        waveGen: 'Wave Generator 🔄',
        flexspline: 'Flexspline (Output) ⚙️',
        circularSpline: 'Circular Spline 🔒',
        eccentric: 'Eccentric Shaft 🔄',
        cycloidDisc: 'Cycloidal Disc ⚙️',
        pinWheel: 'Pin Wheel 🔒',

        // Config
        config: 'Gear Teeth Settings',
        settings: 'Settings',
        sunTeeth: 'Sun (S)',
        ringTeeth: 'Ring (R)',
        planetTeeth: 'Planet (P)',
        flexTeeth: 'Flexspline (F)',
        circTeeth: 'Circular (C)',
        discLobes: 'Lobes',
        numPins: 'Pins',
        updateBtn: 'Update',

        // Fields
        torque: 'Torque',
        speed: 'Speed',
        status: 'Status',
        fixed: 'Fixed',

        // Info
        gearRatio: 'Gear Ratio:',
        reductionRatio: 'Reduction Ratio:',

        // Descriptions
        descPlanetary: 'The <strong>Sun Gear</strong> rotates and drives the <strong>Planet Gears</strong>, which rotate (spin) and orbit inside the <strong>Ring Gear</strong> (fixed). The <strong>Carrier</strong> connects the planets and provides reduced-speed output. Features high torque and compact design.',
        descHarmonic: 'The <strong>Wave Generator</strong> (elliptical cam) rotates and deforms the <strong>Flexspline</strong>. The Flexspline is made of flexible metal that deforms into an ellipse, meshing partially with the <strong>Circular Spline</strong> (fixed). The tooth difference (usually 2 teeth) creates very high reduction ratios (1:50~200).',
        descCycloidal: 'The <strong>Eccentric Shaft</strong> rotates and causes the <strong>Cycloidal Disc</strong> to wobble. The disc\'s lobes sequentially engage with the <strong>Pin Wheel</strong> (fixed) pins, converting to slow rotational motion. Features high torque density and minimal vibration.',

        // Alerts
        alertInvalidTeeth: 'Invalid teeth configuration.',
        alertInvalidFlex: 'Flexspline teeth must be ≥50, Circular must be greater than Flexspline.',
        alertInvalidCycloidal: 'Lobes must be ≥5, Pins must be greater than Lobes.',
    }
};

export let currentLang = 'ko';

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('gearSimLang', lang);
}

export function getLanguage() {
    return currentLang;
}

export function t(key) {
    return translations[currentLang][key] || key;
}

// Initialize from localStorage
const saved = localStorage.getItem('gearSimLang');
if (saved && (saved === 'ko' || saved === 'en')) {
    currentLang = saved;
}
