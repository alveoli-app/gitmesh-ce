import moment from 'moment';
import sharedActions from '@/shared/store/actions';
import { SignalsService } from '@/modules/signals/services/signalsService';
import Errors from '@/shared/error/errors';
import {
  getResultsFromStorage,
  setResultsInStorage,
  shouldFetchNewResults,
  isStorageUpdating,
} from '@/modules/signals/services/signalsStorage';
import Message from '@/shared/message/message';

export default {
  ...sharedActions('signals'),
  async doFetch(
    {
      state, commit, getters, rootGetters,
    },
    { keepPagination = false, resetStorage = false },
  ) {
    const currentUser = rootGetters['auth/currentUser'];
    const currentTenant = rootGetters['auth/currentTenant'];
    const activeView = getters.activeView.id;
    let list = [];
    let count = 0;
    let appendToList = false;

    // Edge case where new results were fetched but user changed tabs
    // This is to prevent a new fetch until the previous results were loaded
    if (
      activeView === 'feed'
      && state.views[activeView].list.loading
      && isStorageUpdating({
        tenantId: currentTenant.id,
        userId: currentUser.id,
      })
    ) {
      return;
    }

    try {
      commit('FETCH_STARTED', {
        keepPagination: resetStorage
          ? false
          : keepPagination,
        activeView,
      });

      // Bookmarks View
      if (activeView === 'bookmarked') {
        const { sorter } = getters.activeView;
        const response = await SignalsService.query(
          {
            action: {
              type: 'bookmark',
              ...(sorter === 'individualBookmarks' && {
                actionById: currentUser.id,
              }),
            },
          },
          getters.orderBy,
          getters.limit,
          getters.offset,
        );

        list = response.rows;
        count = response.count;

        // Append to existing list if offset is not 0
        // User clicked on load more button
        if (getters.offset !== 0) {
          appendToList = true;
        }
      } else {
        // Fetch for new results when
        // resetStorage = true (settings were updated)
        // or criteria to fetch new results = true (new day)
        // or storage is waiting for results
        const fetchNewResults = resetStorage
          || shouldFetchNewResults({
            tenantId: currentTenant.id,
            userId: currentUser.id,
          })
          || isStorageUpdating({
            tenantId: currentTenant.id,
            userId: currentUser.id,
          });

        if (fetchNewResults) {
          // Set storage to be in updating state
          setResultsInStorage({
            posts: [],
            storageDate: null,
            tenantId: currentTenant.id,
            userId: currentUser.id,
          });

          list = await SignalsService.search();

          // Set new results in local storage
          setResultsInStorage({
            posts: list,
            storageDate: moment(),
            tenantId: currentTenant.id,
            userId: currentUser.id,
          });
        } else {
          // Get results from local storage
          list = getResultsFromStorage({
            tenantId: currentTenant.id,
            userId: currentUser.id,
          });
        }
      }

      // Only update view list results if active view is the same from the initial request
      // This is to prevent the user changing between tabs and the request was still loading
      commit('FETCH_SUCCESS', {
        list,
        ...(count && { count }),
        ...(appendToList && { appendToList }),
        activeView,
      });
    } catch (error) {
      Errors.handle(error);
      commit('FETCH_ERROR', {
        activeView,
      });
    }
  },

  // Add temporary actions to post so that UI updates immediately
  async doAddTemporaryPostAction(
    { commit, getters },
    { index, storeActionType, action },
  ) {
    const activeView = getters.activeView.id;

    // Add new action
    if (storeActionType === 'add') {
      commit('CREATE_TEMPORARY_ACTION', {
        action,
        activeView,
        index,
      });
      // Remove action
    } else {
      commit('REMOVE_TEMPORARY_ACTION', {
        action,
        activeView,
        index,
      });
    }
  },

  // Add or remove actions from the database depending on the action type
  async doUpdatePostAction(
    { state, dispatch, getters },
    {
      post, index, storeActionType, actionType,
    },
  ) {
    const activeView = getters.activeView.id;
    const action = state.views[activeView].list.posts[
      index
    ].actions.find((a) => a.type === actionType) || {
      type: actionType,
      timestamp: moment(),
    };
    // Add new action
    if (storeActionType === 'add') {
      await dispatch('doAddAction', {
        post,
        action,
        index,
      });
      // Remove action
    } else {
      await dispatch('doRemoveAction', {
        postId: post.id,
        action,
        index,
      });
    }
  },

  async doAddAction(
    {
      state, commit, getters, rootGetters,
    },
    { post, action, index },
  ) {
    const activeView = getters.activeView.id;
    const oppositeActionTypes = {
      'thumbs-up': 'thumbs-down',
      'thumbs-down': 'thumbs-up',
    };
    const oppositeAction = state.views[
      activeView
    ].list.posts[index].actions.find(
      (a) => a.type === oppositeActionTypes[action.type],
    );

    // If action is thumbs, delete opposite thumbs from post
    if (
      oppositeActionTypes[action.type]
      && oppositeAction
    ) {
      commit('REMOVE_TEMPORARY_ACTION', {
        action: oppositeAction,
        activeView,
        index,
      });

      await SignalsService.deleteAction({
        postId: post.id,
        actionId: oppositeAction.id,
      });
    }

    const postDb = await SignalsService.createContent({
      post: {
        actions: [],
        platform: post.platform,
        post: post.post,
        postedAt: post.postedAt,
        url: post.url,
      },
    });

    const actionDb = await SignalsService.addAction({
      postId: postDb.id,
      action,
    });

    commit('CREATE_ACTION_SUCCESS', {
      post: postDb,
      action: actionDb,
      index,
      activeView,
    });

    // Update posts with new actions in local storage
    const currentUser = rootGetters['auth/currentUser'];
    const currentTenant = rootGetters['auth/currentTenant'];

    setResultsInStorage({
      posts: state.views.feed.list.posts,
      storageDate: moment(),
      tenantId: currentTenant.id,
      userId: currentUser.id,
    });
  },

  async doRemoveAction(
    {
      state, commit, getters, rootGetters,
    },
    { postId, action, index },
  ) {
    const activeView = getters.activeView.id;
    const actionId = action.id;
    const deleteImmediately = activeView === 'bookmarked'
      && action.type === 'bookmark';

    if (deleteImmediately) {
      commit('REMOVE_ACTION_SUCCESS', {
        postId,
        action,
        index,
        activeView,
      });
    }

    await SignalsService.deleteAction({
      postId,
      actionId,
    });

    if (!deleteImmediately) {
      commit('REMOVE_ACTION_SUCCESS', {
        postId,
        action,
        index,
        activeView,
      });
    }

    // Update posts with new actions in local storage
    const currentUser = rootGetters['auth/currentUser'];
    const currentTenant = rootGetters['auth/currentTenant'];

    setResultsInStorage({
      posts: state.views.feed.list.posts,
      storageDate: moment(),
      tenantId: currentTenant.id,
      userId: currentUser.id,
    });
  },

  doAddActionQueue({ commit, state, dispatch }, job) {
    commit('ADD_PENDING_ACTION', job);

    // If there are no actions active, start the next one in the queue
    if (Object.keys(state.activeAction).length === 0) {
      dispatch('doStartActionQueue');
    }
  },

  async doStartActionQueue({
    commit,
    dispatch,
    state,
    getters,
    rootGetters,
  }) {
    if (state.pendingActions.length > 0) {
      commit('SET_ACTIVE_ACTION', state.pendingActions[0]);

      const pendingAction = { ...state.pendingActions[0] };

      commit('POP_CURRENT_ACTION');

      try {
        await pendingAction.handler();
        await dispatch('doStartActionQueue');
      } catch (error) {
        // In case of an error, create post again and update it in UI
        SignalsService.createContent({
          post: pendingAction.post,
        }).then((response) => {
          const activeView = getters.activeView.id;
          const currentUser = rootGetters['auth/currentUser'];
          const currentTenant = rootGetters['auth/currentTenant'];

          commit('UPDATE_POST', {
            activeView,
            index: pendingAction.index,
            post: response,
          });

          // Update posts with new actions in local storage
          setResultsInStorage({
            posts: state.views.feed.list.posts,
            storageDate: moment(),
            tenantId: currentTenant.id,
            userId: currentUser.id,
          });
        });

        Message.error(
          'Something went wrong. Please try again',
        );
        commit('SET_ACTIVE_ACTION', {});
      }
    }

    commit('SET_ACTIVE_ACTION', {});
  },

  async doUpdateSettings(
    { commit, dispatch },
    { data, fetchNewResults = true },
  ) {
    commit('UPDATE_SIGNALS_SETTINGS_STARTED');
    return SignalsService.updateSettings(data)
      .then(() => {
        dispatch('auth/doRefreshCurrentUser', null, {
          root: true,
        }).then(() => {
          commit('UPDATE_SIGNALS_SETTINGS_SUCCESS');

          if (fetchNewResults) {
            dispatch('doFetch', {
              resetStorage: true,
            });
          }
          return Promise.resolve();
        });
      })
      .catch((error) => {
        Errors.handle(error);
        commit('UPDATE_SIGNALS_SETTINGS_ERROR');
        return Promise.reject();
      });
  },
};