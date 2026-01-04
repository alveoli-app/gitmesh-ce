import io
import os

from setuptools import setup, find_namespace_packages


def read(rel_path):
    here = os.path.abspath(os.path.dirname(__file__))
    with io.open(os.path.join(here, rel_path), "r") as fp:
        return fp.read()


setup(
    name="gitmesh-backend",
    packages=find_namespace_packages(include=["gitmesh.*"]),
    install_requires=["pyjwt", "python-dotenv", "requests", "cryptography >= 43.0.0",
                      "python-dateutil", "pytz", "SQLAlchemy==1.4.46", "dnspython>=2.4.0", "boto3"],
)
