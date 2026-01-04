/**
 * Chat Store Index
 * Registers all chat store modules
 */

import chat from './modules/chat'

export default {
    namespaced: true,
    modules: {
        chat,
    },
}
