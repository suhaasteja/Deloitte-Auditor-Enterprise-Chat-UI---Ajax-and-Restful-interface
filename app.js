const openaiApiKey = '';
const chatInput = document.getElementById("chat-input");
const responseOutput = document.getElementById("response-output");
const chatForm = document.getElementById("chat-form");

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userQuestion = chatInput.value;
    saveQuestionAndAnswer(userQuestion, null);
    getTaxAnswerFromOpenAI(userQuestion);
});

function getTaxAnswerFromOpenAI(question) {
    const existingContext = JSON.parse(localStorage.getItem("taxChatContext")) || [];
    const messages = existingContext.map(item => ({
        role: item.role,
        content: item.content
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

        saveQuestionAndAnswer(userQuestion, taxAnswer);
    })
    .catch(error => {
        console.error('Error fetching data from OpenAI:', error);
    });
}

function saveQuestionAndAnswer(question, answer) {
    const timeStamp = new Date().toLocaleString();
    const existingContext = JSON.parse(localStorage.getItem("taxChatContext")) || [];

    if (question) {
        existingContext.push({ role: "user", content: question });
    }
    if (answer) {
        existingContext.push({ role: "assistant", content: answer });
    }

    localStorage.setItem("taxChatContext", JSON.stringify(existingContext));
}
