import { Box, xcss } from '@atlaskit/primitives';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { Routes } from '@/lib/routes';

const navigationContainerStyles = xcss({
  // ads-scanner:ignore-next-line -- ADS xcss token suffix, not a pixel value.
  paddingInline: 'space.300',
});

const destinations = [
  { label: 'For you', path: Routes.docintel.home() },
  { label: 'Library', path: Routes.docintel.library() },
  { label: 'Themes', path: Routes.docintel.themes() },
  { label: 'Deliverables', path: Routes.docintel.deliverables() },
] as const;

export function DocintelNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const selected = destinations.findIndex(({ path }) => location.pathname === path);

  return (
    <nav aria-label="Document Intelligence">
      <Box xcss={navigationContainerStyles}>
        <Tabs
          id="docintel-peer-navigation"
          selected={selected >= 0 ? selected : 0}
          onChange={(index) => {
            const destination = destinations[index];
            if (!destination || destination.path === location.pathname) return;

            navigate({
              pathname: destination.path,
              search: location.search,
            });
          }}
        >
          <TabList>
            {destinations.map(({ label, path }) => (
              <Tab key={path}>{label}</Tab>
            ))}
          </TabList>
        </Tabs>
      </Box>
    </nav>
  );
}

export default DocintelNavigation;
