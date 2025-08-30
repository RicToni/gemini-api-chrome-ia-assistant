// @ts-check

/**
 * @typedef {import("../views/chatBotView.js").ChatbotView} ChatBotView
 * @typedef {import("../services/promptService.js").PromptService} PromptService
 */

export class ChatbotController {

    #abortController;
    #chatbotView;
    #promptService;

    /**
    * @param {Object} deps - Dependencies for the class.
    * @param {ChatBotView} deps.chatbotView - The chatbot view instance.
    * @param {PromptService} deps.promptService - The prompt service instance.
    */
    constructor({ chatbotView, promptService }) {
        this.#chatbotView = chatbotView;
        this.#promptService = promptService;
    }

    async init({ firstBotMessage, text }) {
        this.#setupEvents();
        this.#chatbotView.renderWelcomeBubble();
        this.#chatbotView.setInputEnabled(true);
        this.#chatbotView.appendBotMessage(firstBotMessage, null, false);
        return this.#promptService.init(text);
    }

    #setupEvents() {
        this.#chatbotView.setupEventHandlers({
            onOpen: this.#onOpen.bind(this),
            onSend: this.#chatBotReply.bind(this),
            onStop: this.#handleStop.bind(this),
        });
    };

    #handleStop() {
        this.#abortController.abort()
    };

    async #chatBotReply(userMsg) {
        console.log('received', userMsg)
        this.#chatbotView.showTypingIndicator();
        this.#chatbotView.setInputEnabled(false);

        try {
            this.#abortController = new AbortController();

            const contentNode = this.#chatbotView.createStreamingBotMessage();
            const response =  this.#promptService.prompt(
                userMsg, 
                this.#abortController.signal,
            );
            let fullResponse = '';
            let lastMessage = 'noop'

            const updateText = () => {
                if (!fullResponse) return
                if (fullResponse === lastMessage) return

                lastMessage = fullResponse
                this.#chatbotView.hideTypingIndicator();
                this.#chatbotView.updateStreamingBotMessage(contentNode, fullResponse);

            }

            const intervalId = setInterval(updateText, 50);

            const stopGeneratin = () => {
                clearInterval(intervalId)
                updateText()
                this.#chatbotView.setInputEnabled(true)
            }

            this.#abortController.signal.addEventListener(
                'abort', stopGeneratin
            )

            for await (const chunk of response) {
                fullResponse += chunk
            }

            console.log('Full Response', fullResponse);
            stopGeneratin();

        } catch (error) {
            this.#chatbotView.hideTypingIndicator()
            if (error.name === 'AbortError')
                return console.log('Request aborted by user')

            this.#chatbotView.appendBotMessage("Erro ao obter respota da IA. ")
            console.log("AI Prompt error", error)
        }

        

       
        //this.#chatbotView.appendBotMessage(response);
        //this.#chatbotView.setInputEnabled(true);
        //this.#chatbotView.hideTypingIndicator();
  

    }

    async #onOpen() {
        const errors = this.#checkRequirements();
        if (errors.length){
            const messages = errors.join('\n\n')
            
            this.#chatbotView.appendBotMessage(
                messages
            )
             
            
            this.#chatbotView.setInputEnabled(false);
            return
        }
        this.#chatbotView.setInputEnabled(true);
    }

    #checkRequirements() {
        const errors = [];
        // @ts-ignore
        const isChrome = window.chrome;
        if (!isChrome){
            errors.push(
                "⚠️ Este recurso esta usando API's Google em fase experimental e só funciona no Google Chrome ou Chrome Canary (Em suas versões mais recentes) "
            );
        }

        if (!('LanguageModel' in window)) {
            errors.push(
                "⚠️ As API's nativas do Google que permitem utilizar esta ferramenta não estão ativas em seu navegador."
            );
            errors.push(
                "Ative a seguinte flag em 'chrome://flags/' :"
            );
            errors.push(
                "- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)"
            );
            errors.push(
                "Depois reinicie seu Chrome e tente novamente"
            );
        }

        return errors
    }
}
