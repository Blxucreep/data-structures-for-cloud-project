import pymongo
import json
import time
import statistics

MONGO_HOST = "40.118.102.86"
MONGO_DB = "epic"

client = pymongo.MongoClient(MONGO_HOST, 30000)
db = client[MONGO_DB]

# function to load queries from a file
def load_queries(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

# function to execute a query
def test_query(query_name, collection_name):
    queries = load_queries('projet/queries_to_test.json')
    query_info = queries.get(query_name)
    if query_info is None:
        raise ValueError(f"No query found with name '{query_name}'")

    collection = db[collection_name]
    start_time = time.time()
    result = list(collection.aggregate(query_info['pipeline']))
    process_time = time.time() - start_time

    return result, process_time

# measure performance
def measure_performance(query_name, collection_name, iterations=10):
    execution_times = []
    all_results = None # to store the results from one execution (they should be the same)
    start_time = None

    for _ in range(iterations):
        result, execution_time = test_query(query_name, collection_name)
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
query_name = "query_1"
collection_name = "games_user_view"
avg_time, times, results = measure_performance(query_name, collection_name)

# print results
print(f"Query '{query_name}'")
print(f"Mean execution time: {avg_time:.6f} seconds")
print(f"Number of documents returned: {len(results)}")
