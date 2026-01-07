<template>
  <div class="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-6 relative overflow-y-auto selection:bg-orange-500/30">
    
    <div class="fixed inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

    <div class="relative w-full max-w-sm z-10">
      
      <div class="mb-10 text-center flex flex-col items-center">
        <div class="relative group cursor-default mb-6">
          <div class="flex items-center justify-center gap-3">
            <div class="h-[1px] w-6 bg-zinc-800 group-hover:w-10 group-hover:bg-orange-500 transition-all duration-500"></div>
            <span class="text-white font-sans text-2xl font-black tracking-[0.2em] uppercase italic">
              Git<span class="text-orange-500">Mesh</span>
            </span>
            <div class="h-[1px] w-6 bg-zinc-800 group-hover:w-10 group-hover:bg-orange-500 transition-all duration-500"></div>
          </div>
        </div>

        <div class="inline-flex items-stretch border border-zinc-800 bg-zinc-950 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div class="px-2 py-1 bg-zinc-900 border-r border-zinc-800 flex items-center">
            <span class="text-zinc-500 font-mono text-[9px] uppercase tracking-tighter">System</span>
          </div>
          <div class="px-3 py-1.5 flex items-center gap-2">
            <span class="text-zinc-200 font-mono text-[10px] tracking-tight">root@gitmesh</span>
            <span class="text-zinc-600 font-mono text-[10px]">:</span>
            <span class="text-orange-500 font-mono text-[10px] font-bold">~/invitation</span>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mb-4"></div>
        <span class="text-zinc-400 font-mono text-xs uppercase tracking-widest">Processing_Invitation...</span>
      </div>

      <div v-else-if="warningMessage" class="space-y-6">
        <div class="border border-zinc-800 bg-zinc-950 p-6">
          <div class="flex items-start gap-3 mb-4">
            <i class="ri-alert-line text-orange-500 text-xl mt-0.5"></i>
            <div>
              <h3 class="text-zinc-200 font-mono text-sm uppercase tracking-wider mb-2">Attention_Required</h3>
              <p class="text-zinc-400 font-mono text-xs leading-relaxed">
                This invitation was sent to 
                <a 
                  v-if="parsedWarningMessage.invitedEmail"
                  :href="`mailto:${parsedWarningMessage.invitedEmail}`"
                  class="text-orange-500 font-bold hover:text-orange-400 underline decoration-orange-500/50 hover:decoration-orange-400 transition-colors"
                >{{ parsedWarningMessage.invitedEmail }}</a>
                <span v-else>{{ warningMessage }}</span>
                <template v-if="parsedWarningMessage.signedInEmail">
                  but you're signed in as 
                  <a 
                    :href="`mailto:${parsedWarningMessage.signedInEmail}`"
                    class="text-zinc-200 font-bold hover:text-orange-400 underline decoration-zinc-500/50 hover:decoration-orange-400 transition-colors"
                  >{{ parsedWarningMessage.signedInEmail }}</a>.
                </template>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          :disabled="loading"
          class="group w-full bg-orange-600 hover:bg-orange-500 text-black h-11 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] relative overflow-hidden"
          @click="doAcceptWithWrongEmail"
        >
          <div class="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <span class="flex items-center gap-2 relative z-10">
            <app-i18n code="tenant.invitation.acceptWrongEmail" />
          </span>
        </button>

        <button
          type="button"
          class="w-full h-10 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-900/30 text-zinc-500 hover:text-orange-500 font-mono text-[10px] uppercase tracking-widest transition-all mt-3"
          @click="doSignout"
        >
          // sign_out
        </button>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-12">
        <div class="border border-zinc-800 bg-zinc-950 p-6 text-center w-full">
          <i class="ri-mail-check-line text-orange-500 text-3xl mb-4"></i>
          <p class="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-4">Validating_Invitation_Token...</p>
          <div v-if="invitedEmail" class="pt-4 border-t border-zinc-800">
            <span class="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Invitation_For:</span>
            <p class="text-orange-500 font-mono text-sm font-bold mt-1">{{ invitedEmail }}</p>
          </div>
        </div>
      </div>

      <div class="text-center mt-8 flex items-center justify-center gap-6">
        <router-link :to="{ name: 'signin' }" class="text-zinc-500 hover:text-orange-500 text-[10px] font-mono transition-colors uppercase tracking-widest">
          // login
        </router-link>
        <router-link :to="{ path: '/' }" class="text-zinc-500 hover:text-orange-500 text-[10px] font-mono transition-colors uppercase tracking-widest">
          // home
        </router-link>
      </div>

    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import AuthInvitationToken from '@/modules/auth/auth-invitation-token';
import { router } from '@/router';
import { TenantService } from '@/modules/tenant/tenant-service';
import Errors from '@/shared/error/errors';
import AppI18n from '@/shared/i18n/i18n.vue';

export default {
  name: 'AppInvitationPage',
  components: { AppI18n },
  data() {
    return {
      loading: false,
      warningMessage: null,
    };
  },

  computed: {
    ...mapGetters('auth', ['signedIn', 'currentUserEmail']),
    token() {
      return this.$route.query.token;
    },
    invitedEmail() {
      return this.$route.query.email || null;
    },
    parsedWarningMessage() {
      if (!this.warningMessage) return null;
      // Extract emails from the warning message using regex
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const emails = this.warningMessage.match(emailRegex) || [];
      
      if (emails.length < 2) {
        return { text: this.warningMessage, invitedEmail: null, signedInEmail: null };
      }
      
      return {
        invitedEmail: emails[0],
        signedInEmail: emails[1],
      };
    },
  },

  mounted() {
    this.doAcceptFromAuth(this.token);
  },

  methods: {
    ...mapActions('auth', ['doSignout', 'doSelectTenant', 'doWaitUntilInit']),

    doAcceptWithWrongEmail() {
      this.doAcceptFromAuth(this.token, true);
    },
    async doAcceptFromAuth(token, forceAcceptOtherEmail = false) {
      if (this.loading) {
        return;
      }
      try {
        await this.doWaitUntilInit();
        if (!this.signedIn) {
          AuthInvitationToken.set(token);
          router.push('/auth/signup');
          return;
        }

        this.warningMessage = null;
        this.loading = true;

        TenantService.acceptInvitation(
          token,
          forceAcceptOtherEmail,
        )
          .then((tenant) => this.doSelectTenant({ tenant }))
          .then(() => {
            this.warningMessage = null;
            this.loading = false;
          })
          .catch((error) => {
            if (Errors.errorCode(error) === 404) {
              this.loading = false;
              router.push('/');
              return;
            }

            if (Errors.errorCode(error) === 400) {
              this.warningMessage = Errors.selectMessage(error);
              this.loading = false;
              return;
            }

            Errors.handle(error);
            this.warningMessage = null;
            this.loading = false;
            router.push('/');
          });
      } catch (_) {
        router.push('/auth/signup');
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;600;700;900&display=swap');

.font-sans { font-family: 'Inter', sans-serif; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
</style>
