import {type Effect, effect, hook, type Query, query} from "leo-query";
import {create} from "zustand";
import type {User} from "@/shared/model/types.ts";
import {createUser, deleteUser, getUser, updateUser} from "@/shared/api/api.ts";

export interface UserStore {
  getUser: Query<UserStore, User[]>;
  createUser: Effect<UserStore, [User]>;
  updateUser: Effect<UserStore, [User]>;
  deleteUser: Effect<UserStore, [number]>;
}

export const useUserStore = create<UserStore>(() => ({
  getUser: query(getUser, (s) => [s.createUser, s.updateUser, s.deleteUser]),
  createUser: effect(createUser),
  updateUser: effect(updateUser),
  deleteUser: effect(deleteUser)
}));

export const useUserStoreAsync = hook(useUserStore);