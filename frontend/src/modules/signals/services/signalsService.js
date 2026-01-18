import authAxios from '@/shared/axios/auth-axios';
import AuthCurrentTenant from '@/modules/auth/auth-current-tenant';

// Community Edition Signals Service
// This provides the same API interface as premium but for community edition
class SignalsService {
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

  static async updateSettings(data) {
    const tenantId = AuthCurrentTenant.get();

    const response = await authAxios.put(
      `/tenant/${tenantId}/signalsContent/settings`,
      data,
    );

    return response.data;
  }
}

export { SignalsService };