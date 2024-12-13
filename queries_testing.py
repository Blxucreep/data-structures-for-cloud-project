from sshtunnel import SSHTunnelForwarder
import pymongo
import json
import time
import statistics

MONGO_HOST = "mesiin59202401009.westeurope.cloudapp.azure.com"
MONGO_DB = "epic_games_store"
MONGO_USER = "administrateur"
MONGO_PASS = "SuperPassword!1"

server = SSHTunnelForwarder(
    MONGO_HOST,
    ssh_username=MONGO_USER,
    ssh_password=MONGO_PASS,
    remote_bind_address=('127.0.0.1', 27017)
)

server.start()
client = pymongo.MongoClient('127.0.0.1', server.local_bind_port) # server.local_bind_port
                                                                  # is assigned local port
db = client[MONGO_DB]

# function to load queries from a file
def load_queries(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

# function to execute a query
def test_query(query_name):
    queries = load_queries('projet/queries_to_test.json')
    query_info = queries.get(query_name)
    if query_info is None:
        raise ValueError(f"No query found with name '{query_name}'")

    collection = db[query_info['collection']]
    if query_info['function'] == 'find':
        result = list(collection.find(query_info['filter']))
    elif query_info['function'] == 'aggregate':
        result = list(collection.aggregate(query_info['pipeline']))
    else:
        raise ValueError(f"Unsupported function '{query_info['function']}'")

    return result

# measure performance
def measure_performance(query_name, iterations=10):
    execution_times = []
    all_results = None # to store the results from one execution (they should be the same)
    start_time = None

    for _ in range(iterations):
        start_time = time.time()
        result = test_query(query_name)
        execution_time = time.time() - start_time
        execution_times.append(execution_time)
        
        # store the results only once (from the first iteration)
        if all_results is None:
            all_results = result

    # remove max and min time
    execution_times.remove(max(execution_times))
    execution_times.remove(min(execution_times))
    
    # calculate the average
    avg_time = statistics.mean(execution_times)
    return avg_time, execution_times, all_results

# execute the query
query_name = "query_5"
avg_time, times, results = measure_performance(query_name)

# print results
print(f"Query '{query_name}'")
print(f"Mean execution time: {avg_time:.4f} seconds")
print(f"Number of documents returned: {len(results)}")

server.stop()
