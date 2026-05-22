import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {User} from "@/shared/model/types.ts";
import {createUser, getUser} from "@/shared/api/api.ts";

export interface UserStore {
  getUser: Query<UserStore, User[]>;
  createUser: Effect<UserStore, [User]>;
}

export const useUserStore = create<UserStore>((set) => ({
  getUser: query(getUser, (s) => [s.createUser]), //invalidate todos when createTodo succeeds
  createUser: effect(createUser)
}));

export const useUserStoreAsync = hook(useUserStore);