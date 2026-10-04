import React from "react";
import { AppTabs } from "../../app-tabs";
import { useService } from "../../service-state";
import { LoginScreen } from "../../screens";
export default function TabLayout() {
  return useService().signed ? <AppTabs /> : <LoginScreen />;
}
