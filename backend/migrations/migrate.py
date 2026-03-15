import argparse
from .create_tables import create_all_tables, drop_all_tables

def run_migrations():
    """Function untuk menjalankan migrasi dari command line"""
    parser = argparse.ArgumentParser(description='Database Migration Tool')
    parser.add_argument('--action', choices=['up', 'down', 'refresh'], 
                       default='up', help='Migration action: up (create), down (drop), refresh (drop+create)')
    
    args = parser.parse_args()
    
    if args.action == 'down':
        drop_all_tables()
    elif args.action == 'refresh':
        drop_all_tables()
        print("\n" + "="*50 + "\n")
        create_all_tables()
    else:  # up
        create_all_tables()

if __name__ == '__main__':
    run_migrations()