import { AtlassianNavigation, CustomProductHome } from '@atlaskit/atlassian-navigation';
import { Flex } from '@atlaskit/primitives';
import { AppSwitcher } from '@/components/layout/AppSwitcher';
import { AskCatalystPill } from '@/components/layout/AskCatalystPill';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { CreateDropdown } from './CreateDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import catalystLogoMark2 from '@/assets/catalyst-logo-mark-2.svg';
import catalystWordmark3 from '@/assets/catalyst-wordmark-3.svg';

function ProductHome() {
  return (
    <CustomProductHome
      href="/for-you"
      iconAlt="Catalyst"
      iconUrl={catalystLogoMark2}
      logoAlt="Catalyst"
      logoUrl={catalystWordmark3}
      siteTitle="Catalyst"
    />
  );
}

function CreateAndAskActions() {
  return (
    <Flex alignItems="center" gap="space.150">
      <CreateDropdown />
      <AskCatalystPill />
    </Flex>
  );
}

export function CatalystHeader() {
  return (
    <AtlassianNavigation
      label="Catalyst"
      renderProductHome={ProductHome}
      renderAppSwitcher={AppSwitcher}
      renderSearch={() => <GlobalSearch />}
      renderCreate={CreateAndAskActions}
      renderNotifications={NotificationsPanel}
      renderSettings={SettingsMenu}
      renderProfile={ProfileMenu}
      primaryItems={[]}
    />
  );
}

export default CatalystHeader;