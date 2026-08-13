/** Authentication layer - scaffold. */
function getCurrentUser_() {
  return Session.getActiveUser().getEmail();
}
