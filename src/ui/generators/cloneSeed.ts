/**
 * Shared key under which the ShowView "Clone" action stashes a record's writable
 * values in react-router location state, for the create form to pre-fill from.
 * Router state is cleared on the next navigation, so a cloned seed never leaks
 * into an unrelated "New" form.
 */
export const CLONE_STATE_KEY = 'volcanicCloneSeed'
