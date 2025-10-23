import { Browser } from 'happy-dom';
import fs from 'fs';

const borwser = new Browser({
    settings: {
        enableJavaScriptEvaluation: true,
        suppressInsecureJavaScriptEnvironmentWarning: true,
        fetch: {
            interceptor: {
                beforeAsyncRequest: async ({ request, window }) => {
                    console.log('🔍 Main window request intercepted:', request.url);
                    console.log('📋 Request method:', request.method);
                    console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()));
                },
                afterAsyncResponse: async ({ request, response, window }) => {
                    console.log('✅ Main window response received:', request.url);
                    // console.log('📋 Response status:', response.status);
                    console.log('📋 Response body:', JSON.stringify(response.body));
                },
            },
            disableSameOriginPolicy: true,
        },
    },
});

const page = borwser.newPage();

// Функция для перехвата запросов из iframe
function setupIframeRequestInterceptor(iframeWindow: Window) {
    const originalFetch = iframeWindow.fetch;

    iframeWindow.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method || 'GET';

        console.log('🚀 IFRAME REQUEST:', {
            url,
            method,
            headers: init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {},
            body: init?.body,
        });

        try {
            const response = await originalFetch(input, init);

            console.log('📥 IFRAME RESPONSE:', {
                url,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
            });

            // Клонируем response для чтения тела
            const clonedResponse = response.clone();
            try {
                const responseText = await clonedResponse.text();
                console.log(
                    '📄 IFRAME RESPONSE BODY:',
                    responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
                );
            } catch (e) {
                console.log('❌ Не удалось прочитать тело ответа:', e.message);
            }

            return response;
        } catch (error) {
            console.log('❌ IFRAME REQUEST ERROR:', {
                url,
                error: error.message,
            });
            throw error;
        }
    };
}

let data = fs.readFileSync('frame.html');
page.content = data.toString();

console.log('🔍 Initial state:');
console.log('Button:', page.mainFrame.document.querySelector('#loadBtn')?.outerHTML);
// console.log('Iframe:', page.mainFrame.document.querySelector('iframe')?.outerHTML);

// // Кликаем на кнопку загрузки
page.mainFrame.document.querySelector('#loadBtn')?.click();

// console.log('🔍 After load click:');
// console.log('Button:', page.mainFrame.document.querySelector('#loadBtn')?.outerHTML);
console.log('Iframe:', page.mainFrame.document.querySelector('iframe')?.contentDocument?.querySelector("#result")?.outerHTML);

// Ждем загрузки iframe и настраиваем перехватчики
setTimeout(() => {
    const iframe = page.mainFrame.document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
        console.log('🎯 Setting up iframe request interceptors...');
        setupIframeRequestInterceptor(iframe.contentWindow);
        console.log('✅ Iframe interceptors set up successfully!');

        // Теперь кликаем на тестовую кнопку
        setTimeout(() => {
            console.log('🧪 Clicking test button...');
            // page.mainFrame.document.querySelector('#testBtn')?.click();
            let iframe = page.mainFrame.document.querySelector('iframe');
            // iframe?.contentDocument?.querySelector('.captcha-actions_reload')?.click();
        }, 500);
    } else {
        console.log('❌ Iframe not found or not loaded yet');
    }
}, 1000);
