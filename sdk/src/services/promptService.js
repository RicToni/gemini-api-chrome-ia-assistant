
export class PromptService {
    #messages = [];

    async init(initialPrompts){
        if(!window.LanguageModel) return

        this.#messages.push({
            role: 'system',
            content: initialPrompts
        })
    }
}
