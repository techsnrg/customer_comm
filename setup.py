from setuptools import setup

name = "customer_communication"

setup(
	name=name,
	version="0.0.1",
	description="A unified customer journey system for ERPNext",
	author="Nikhil Goel",
	author_email="nikhil@email.com",
	packages=[name],
	zip_safe=False,
	include_package_data=True,
	install_requires=(
		"frappe"
	),
)
