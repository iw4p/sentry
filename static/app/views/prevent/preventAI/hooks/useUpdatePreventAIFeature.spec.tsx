import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {act, renderHook} from 'sentry-test/reactTestingLibrary';

import {OrganizationContext} from 'sentry/views/organizationContext';

import {useUpdatePreventAIFeature} from './useUpdatePreventAIFeature';

describe('useUpdatePreventAIFeature', () => {
  function getWrapper(organization: any) {
    const queryClient = new QueryClient();
    return function Wrapper({children}: {children: React.ReactNode}) {
      return (
        <QueryClientProvider client={queryClient}>
          <OrganizationContext.Provider value={organization}>
            {children}
          </OrganizationContext.Provider>
        </QueryClientProvider>
      );
    };
  }

  const org = {
    slug: 'test-org',
    id: '1',
    access: ['org:write', 'org:admin'],
    preventAiConfigGithub: {},
  };

  beforeEach(() => {
    MockApiClient.clearMockResponses();
  });

  it('calls API with correct params to enable a feature', async () => {
    const mockResponse = MockApiClient.addMockResponse({
      url: '/organizations/test-org',
      method: 'PUT',
      body: {success: true},
    });
    const wrapper = getWrapper(org);

    const {result} = renderHook(() => useUpdatePreventAIFeature(), {wrapper});

    await act(async () => {
      await result.current.enableFeature({
        feature: 'vanilla',
        enabled: true,
        orgName: 'org-1',
        repoName: 'repo-1',
      });
    });

    expect(mockResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        data: {
          feature: 'vanilla',
          enabled: true,
          orgName: 'org-1',
          repoName: 'repo-1',
        },
      })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('sets error if API call fails', async () => {
    const mockResponse = MockApiClient.addMockResponse({
      url: '/organizations/test-org',
      method: 'PUT',
      statusCode: 400,
      body: {detail: 'fail'},
    });
    const wrapper = getWrapper(org);

    const {result} = renderHook(() => useUpdatePreventAIFeature(), {wrapper});

    await act(async () => {
      await result.current.enableFeature({
        feature: 'vanilla',
        enabled: false,
        orgName: 'org-1',
        repoName: 'repo-1',
      });
    });

    expect(mockResponse).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading is true while request is in progress', async () => {
    let resolvePromise: (value?: unknown) => void;
    const wrapper = getWrapper(org);

    const {result} = renderHook(() => useUpdatePreventAIFeature(), {wrapper});

    act(() => {
      result.current.enableFeature({
        feature: 'vanilla',
        enabled: true,
        orgName: 'org-1',
        repoName: 'repo-1',
      });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
  });
});
