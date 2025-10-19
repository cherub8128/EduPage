export const defaultConfig = {
    reportTitle: '나의 보고서',
    fileName: 'my-report',
    paperSize: 'a4',
    themeColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
    fontFamily: 'sans',
    components: [
        { id: Date.now(), type: 'h1', content: '보고서 제목을 입력하세요' }
    ]
};
