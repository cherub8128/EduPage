
document.addEventListener('DOMContentLoaded', () => {
    const allCodeBlocks = document.querySelectorAll('.code-block-wrapper');

    allCodeBlocks.forEach(wrapper => {
        const copyButton = wrapper.querySelector('.copy-button');
        const codeElement = wrapper.querySelector('pre > code');

        if (!copyButton || !codeElement) return;

        copyButton.addEventListener('click', () => {
            const codeToCopy = codeElement.innerText;

            navigator.clipboard.writeText(codeToCopy).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');

                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                    copyButton.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                copyButton.textContent = 'Error';
                console.error('Failed to copy text: ', err);
            });
        });
    });
});
