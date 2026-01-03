export interface GroupsioIntegrationData {
  email: string
  token: string
  groupNames: GroupName[]
  password?: string // Optional: if provided, will be encrypted and stored for cookie refresh
}

export interface GroupsioGetToken {
  email: string
  password: string
  twoFactorCode?: string
}

export interface GroupsioVerifyGroup {
  groupName: GroupName
  cookie: string
}

export type GroupName = string
