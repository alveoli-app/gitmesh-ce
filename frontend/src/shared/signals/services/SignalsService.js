/**
 * Shared Signals Service
 * Common API service used by both community and premium editions
 */

import authAxios from '@/shared/axios/auth-axios';
import AuthCurrentTenant from '@/modules/auth/auth-current-tenant';

export class SignalsService {
  static async query(filter, orderBy, limit, offset) {
    const body = {
      filter,
      orderBy,
      limit,
      offset,
    };

    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.post(
      `/tenant/${tenantId}/signalsContent/query`,
      body,
    );

    return response.data;
  }

  static async search() {
    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.get(
      `/tenant/${tenantId}/signalsContent/search`,
    );

    return response.data;
  }

  static async createContent({ post }) {
    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.post(
      `/tenant/${tenantId}/signalsContent`,
      post,
    );

    return response.data;
  }

  static async track({ event, params }) {
    const tenantId = AuthCurrentTenant.get();
    const response = await authAxios.post(
      `/tenant/${tenantId}/signalsContent/track`,
      {
        event,
        params,
      },
    );
    return response.data;
  }

  static async generateReply({ title, description }) {
    const tenantId = AuthCurrentTenant.get();
    const response = await authAxios.get(
      `/tenant/${tenantId}/signalsContent/reply`,
      {
        params: {
          title,
          description,
        },
      },
    );
    return response.data;
  }

  static async addAction({ postId, action }) {
    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.post(
      `/tenant/${tenantId}/signalsContent/${postId}/action`,
      action,
    );

    return response.data;
  }

  static async deleteAction({ postId, actionId }) {
    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.delete(
      `/tenant/${tenantId}/signalsContent/${postId}/action/${actionId}`,
    );

    return response.data;
  }

  static async updateSettings(data, isSentinel = false) {
    const tenantId = AuthCurrentTenant.get();

    const endpoint = `/tenant/${tenantId}/signalsContent/settings`;
    
    // Use axios params for query parameters
    const config = isSentinel ? { params: { feature: 'sentinel' } } : {};

    console.log('🚀 SignalsService.updateSettings called');
    console.log('  - isSentinel:', isSentinel);
    console.log('  - config.params:', config.params);
    console.log('  - endpoint:', endpoint);
    console.log('  - data:', data);

    const response = await authAxios.put(
      endpoint,
      data,
      config,
    );

    console.log('✅ SignalsService.updateSettings response:', response.data);

    return response.data;
  }
}