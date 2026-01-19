import { MenuLink } from '@/modules/layout/types/MenuLink';

const organizations: MenuLink = {
  id: 'organizations',
  label: 'Organizations',
  icon: 'ri-community-line',
  routeName: 'signals-organizations',
  display: () => true,
  disable: () => false,
};

export default organizations;
