import csv

# Define the cycle lengths and corresponding labels
cycles = [1, 2, 3, 5, 7, 11, 13, 17, 19]
values = ["LN", "CN", "NN", "NG", "NE", "CG", "CE", "LG", "LE"]

def generate_repeats_to_csv(cycles, values, years, output_path):
    """
    Generate a CSV file listing, for each year, which values repeat based on their cycle lengths.

    :param cycles: list of cycle lengths (integers)
    :param values: list of corresponding labels (strings)
    :param years: maximum year (inclusive) to generate
    :param output_path: path to write the CSV output
    """
    if len(cycles) != len(values):
        raise ValueError("Number of cycles and values must match.")

    with open(output_path, mode='w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Year", "Repeats"])

        for year in range(years + 1):
            repeats = [label for cycle, label in zip(cycles, values) if year % cycle == 0]
            writer.writerow([year, ", ".join(repeats)])

# Generate the CSV for 3000 years, outputting to 'repeats.csv'
generate_repeats_to_csv(cycles, values, 3000, 'repeats.csv')
