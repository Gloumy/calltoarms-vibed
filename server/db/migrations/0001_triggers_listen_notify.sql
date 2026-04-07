-- Notifier à chaque changement de session active
CREATE OR REPLACE FUNCTION notify_session_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('session_changes', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_change_trigger
AFTER INSERT OR UPDATE ON game_sessions
FOR EACH ROW EXECUTE FUNCTION notify_session_change();

-- Notifier à chaque changement de statut disponible
CREATE OR REPLACE FUNCTION notify_availability_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.available_until IS DISTINCT FROM NEW.available_until THEN
    PERFORM pg_notify('availability_changes', json_build_object(
      'user_id', NEW.id,
      'available_until', NEW.available_until,
      'available_game_id', NEW.available_game_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_change_trigger
AFTER UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION notify_availability_change();
