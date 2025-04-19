from setuptools import setup, find_packages

setup(
    name="zangalewa",
    version="0.1.0",
    description="An AI-powered command-line assistant for bioinformatics and technical workflows",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Kundai Sachikonye",
    author_email="kundai.sachikonye@bitspark.com",
    url="https://github.com/fullscreen-triangle/zangalewa",
    packages=find_packages(),
    include_package_data=True,
    license="MIT",
    python_requires=">=3.10",
    install_requires=[
        "rich>=13.0.0",
        "textual>=0.20.0",
        "aiohttp>=3.8.3",
        "requests>=2.28.2",
        "faiss-cpu>=1.7.4",
        "psutil>=5.9.4",
        "pyyaml>=6.0",
        "python-dotenv>=1.0.0",
        "openai>=0.27.0",
        "anthropic>=0.2.9",
    ],
    extras_require={
        "testing": [
            "pytest>=7.3.1",
            "hypothesis>=6.70.0",
        ],
        "docs": [
            "sphinx>=6.2.0",
            "mkdocs>=1.4.2",
        ],
        "analysis": [
            "pylint>=2.17.0",
            "radon>=5.1.0",
            "astroid>=2.15.0",
        ],
        "dev": [
            "pytest>=7.3.1",
            "hypothesis>=6.70.0",
            "sphinx>=6.2.0",
            "mkdocs>=1.4.2",
            "pylint>=2.17.0",
            "radon>=5.1.0",
            "astroid>=2.15.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "zangalewa=zangalewa.cli.app:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
    ],
) 