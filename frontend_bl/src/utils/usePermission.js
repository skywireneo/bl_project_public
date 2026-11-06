import { useContext } from "react";
import { Context } from "..";

export const usePermission = (permissionCode) => {
    const { user } = useContext(Context);
    return user.permissions.includes(permissionCode);
};