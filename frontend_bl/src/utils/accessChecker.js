import { useContext } from "react";
import { Context } from "..";

export function useAccessChecker() {
    const { user } = useContext(Context);
    const userAccesses = user.user?.access || [];

    return (accessName) => userAccesses.includes(accessName);
}