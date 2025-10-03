import {updateOrganization} from 'sentry/actionCreators/organizations';
import type {PreventAIFeatureTriggers} from 'sentry/types/prevent';
import {useMutation} from 'sentry/utils/queryClient';
import useApi from 'sentry/utils/useApi';
import useOrganization from 'sentry/utils/useOrganization';

interface UpdatePreventAIFeatureParams {
  enabled: boolean;
  feature: 'vanilla' | 'test_generation' | 'bug_prediction';
  orgName: string;
  repoName?: string;
  trigger?: Partial<PreventAIFeatureTriggers>;
}

export function useUpdatePreventAIFeature() {
  const api = useApi();
  const organization = useOrganization();
  const {mutateAsync, isPending, error} = useMutation({
    mutationFn: async (params: UpdatePreventAIFeatureParams) => {
      if (!organization.preventAiConfigGithub) {
        throw new Error('Organization has no prevent AI config');
      }
      const editableConfig = structuredClone(organization.preventAiConfigGithub);

      const editableOrgConfig =
        editableConfig.github_organizations[params.orgName] ??
        structuredClone(editableConfig.default_org_config);
      editableConfig.github_organizations[params.orgName] = editableOrgConfig;

      let editableFeatureConfig = editableOrgConfig.org_defaults;
      if (params.repoName) {
        let overrides = editableOrgConfig.repo_overrides[params.repoName];
        if (!overrides) {
          overrides = structuredClone(editableOrgConfig.org_defaults);
          editableOrgConfig.repo_overrides[params.repoName] = overrides;
        }
        editableFeatureConfig = editableOrgConfig.repo_overrides[params.repoName]!;
      }
      editableFeatureConfig[params.feature] = {
        enabled: params.enabled,
        triggers: {...editableFeatureConfig[params.feature].triggers, ...params.trigger},
        sensitivity: editableFeatureConfig[params.feature].sensitivity,
      };

      return api.requestPromise(`/organizations/${organization.slug}/`, {
        method: 'PUT',
        data: {preventAiConfigGithub: editableConfig},
      });
    },
    onSuccess: updateOrganization,
  });

  return {
    enableFeature: mutateAsync,
    isLoading: isPending,
    error: error?.message,
  };
}
