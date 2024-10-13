const openaiApiKey = '';
const chatInput = document.getElementById("chat-input");
const responseOutput = document.getElementById("response-output");
const chatForm = document.getElementById("chat-form");

let db;
const request = indexedDB.open('taxAuditDB', 1);


request.onupgradeneeded = (event) => {
    db = event.target.result;
    const objectStore = db.createObjectStore('prompts', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('prompt', 'prompt', { unique: false });
    objectStore.createIndex('response', 'response', { unique: false });
    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
    objectStore.createIndex('contextWindow', 'contextWindow', { unique: false });
};

request.onsuccess = (event) => {
    db = event.target.result;
};

request.onerror = (event) => {
    console.error('IndexedDB error:', event.target.errorCode);
};


chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userQuestion = chatInput.value;
    const contextWindow = new Date().toISOString(); // Use timestamp as the context window

    saveQuestionAndAnswer(userQuestion, null, contextWindow);

    getTaxAnswerFromOpenAI(userQuestion, contextWindow);
});


function getTaxAnswerFromOpenAI(question, contextWindow) {

    getContextHistory((existingContext) => {
        const messages = existingContext.map(item => ({
            role: item.prompt ? "user" : "assistant",
            content: item.prompt || item.response
        }));


        messages.push({
            role: "user",
            content: `You are a US tax expert. Respond only with answers based on US tax laws and IRS guidelines. The user has asked the following question about taxes: "${question}". Please provide a clear and accurate answer that adheres to US tax law.`
        });

        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 150,
                temperature: 0
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const taxAnswer = data.choices[0].message.content.trim();
            responseOutput.value = taxAnswer;
            chatInput.value = '';

            saveQuestionAndAnswer(question, taxAnswer, contextWindow);
        })
        .catch(error => {
            console.error('Error fetching data from OpenAI:', error);
        });
    });
}

function saveQuestionAndAnswer(question, answer, contextWindow) {
    const timestamp = new Date().toLocaleString();
    
    const transaction = db.transaction(['prompts'], 'readwrite');
    const objectStore = transaction.objectStore('prompts');

    const data = {
        prompt: question,
        response: answer,
        timestamp: timestamp,
        contextWindow: contextWindow
    };

    objectStore.add(data);

    transaction.oncomplete = () => {
        console.log("Prompt and response saved successfully.");
    };

    transaction.onerror = (event) => {
        console.error("Error saving prompt and response:", event.target.errorCode);
    };
}

function getContextHistory(callback) {
    const transaction = db.transaction(['prompts'], 'readonly');
    const objectStore = transaction.objectStore('prompts');
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
        const context = event.target.result;
        callback(context);
    };

    request.onerror = (event) => {
        console.error("Error fetching context history:", event.target.errorCode);
    };
}
