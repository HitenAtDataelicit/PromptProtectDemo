let logoutTimer: NodeJS.Timeout | null = null;

const INACTIVITY_LIMIT = 20 * 60 * 1000;

export function startSessionWatcher(onLogout: () => void) {
  const events = ["mousemove", "keydown", "click", "scroll"];

  const resetTimer = () => {
    if (logoutTimer) clearTimeout(logoutTimer);

    logoutTimer = setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (err) {
        console.error("Logout failed", err);
      }
      onLogout();
    }, INACTIVITY_LIMIT);
  };

  events.forEach((event) => {
    window.addEventListener(event, resetTimer);
  });

  resetTimer();
}