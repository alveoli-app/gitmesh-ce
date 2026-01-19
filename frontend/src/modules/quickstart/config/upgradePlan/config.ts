import { QuickstartWidget } from '@/modules/quickstart/config/widgets';
import QuickstartUpgradePlanWidget from '@/modules/quickstart/config/upgradePlan/quickstart-upgrade-plan-widget.vue';
import config from '@/config';

const upgradePlan: QuickstartWidget = {
  id: 'upgradePlan',
  display: ({ tenant }) => false, // Disable upgrade prompt since all plans are now enterprise
  component: QuickstartUpgradePlanWidget,
};

export default upgradePlan;
