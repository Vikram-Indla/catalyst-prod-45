-- Create audit logging trigger for strategy_snapshots
CREATE TRIGGER log_strategy_snapshot_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.strategy_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.log_activity();